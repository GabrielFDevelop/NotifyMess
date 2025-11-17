// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Emitter;
use axum::{routing::get, extract::Query, response::Html, Router};
use rand::{distributions::Alphanumeric, Rng};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use base64::engine::general_purpose::URL_SAFE_NO_PAD as B64;
use base64::Engine;
use std::net::SocketAddr;
use tokio::sync::oneshot;
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn start_twitch_chat(app: tauri::AppHandle, channel: String) -> Result<(), String> {
    tauri::async_runtime::spawn(async move {
        let config = twitch_irc::ClientConfig::default();
        let (mut incoming, client) = twitch_irc::TwitchIRCClient::<
            twitch_irc::SecureTCPTransport,
            twitch_irc::login::StaticLoginCredentials,
        >::new(config);

        // join channel (unwrap only fails on malformed login)
        let _ = client.join(channel.clone());

        while let Some(msg) = incoming.recv().await {
            if let twitch_irc::message::ServerMessage::Privmsg(p) = msg {
                let payload = serde_json::json!({
                    "id": p.message_id,
                    "channel": p.channel_login,
                    "user": p.sender.name,
                    "message": p.message_text,
                    "timestamp": chrono::Utc::now().timestamp_millis(),
                });
                let _ = app.emit("twitch://chat_message", payload);
            }
        }
    });
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, start_twitch_chat, twitch_login_pkce])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(Serialize)]
struct LoginResult {
    access_token: String,
    token_type: String,
    expires_in: u64,
    scope: Vec<String>,
    login: String,
    client_id: String,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    token_type: String,
    expires_in: u64,
}

#[derive(Deserialize)]
struct ValidateResponse {
    login: String,
    scopes: Vec<String>,
}

#[derive(Deserialize)]
struct AuthQuery { code: String, state: Option<String> }

#[tauri::command]
async fn twitch_login_pkce(app: tauri::AppHandle, client_id: Option<String>) -> Result<LoginResult, String> {
    let port = 18200u16;
    let redirect_uri = format!("http://127.0.0.1:{}/callback", port);
    let client_id = match client_id.and_then(|s| if s.trim().is_empty() { None } else { Some(s) }) {
        Some(id) => id,
        None => std::env::var("TWITCH_CLIENT_ID").unwrap_or_default(),
    };
    if client_id.is_empty() {
        // Sem Client ID configurado, apenas orientar o usuário a efetuar login via web.
        let _ = app.emit("auth://twitch_authorize_url", "https://www.twitch.tv/login");
        return Err("Twitch OAuth não configurado: informe o Client ID da sua aplicação.".to_string());
    }

    let code_verifier: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(64)
        .map(char::from)
        .collect();
    let challenge = {
        let mut hasher = Sha256::new();
        hasher.update(code_verifier.as_bytes());
        let hashed = hasher.finalize();
        B64.encode(hashed)
    };
    let state: String = rand::thread_rng().sample_iter(&Alphanumeric).take(16).map(char::from).collect();

    let auth_url = format!(
        "https://id.twitch.tv/oauth2/authorize?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}&code_challenge={}&code_challenge_method=S256&force_verify=false",
        urlencoding::encode(&client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode("chat:read chat:write moderator:manage:chat_messages user:read:moderated_channels channel:read:vips channel:read:editors"),
        urlencoding::encode(&state),
        urlencoding::encode(&challenge)
    );

    let (tx, rx) = oneshot::channel::<String>();
    let app_clone = app.clone();
    use std::sync::{Arc, Mutex};
    let tx_cell: Arc<Mutex<Option<oneshot::Sender<String>>>> = Arc::new(Mutex::new(Some(tx)));
    let tx_cell_router = tx_cell.clone();
    let expected_state = state.clone();
    let router = Router::new().route(
        "/callback",
        get(move |Query(q): Query<AuthQuery>| {
            let tx_cell_inner = tx_cell_router.clone();
            let expected = expected_state.clone();
            async move {
                if let Some(sender) = tx_cell_inner.lock().unwrap().take() {
                    if q.state.as_deref() != Some(&expected) {
                        let _ = sender.send("STATE_MISMATCH".to_string());
                        return Html("Estado inválido. Você pode fechar esta janela.");
                    } else {
                        let _ = sender.send(q.code);
                    }
                }
                Html("Login concluído. Você pode fechar esta janela.")
            }
        }),
    );
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    tokio::spawn(async move {
        let listener = match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => l,
            Err(_) => return,
        };
        let _ = axum::serve(listener, router).await;
    });

    let _ = app_clone.emit("auth://twitch_authorize_url", auth_url.clone());

    let code = rx.await.map_err(|e| e.to_string())?;
    if code == "STATE_MISMATCH" { return Err("Estado inválido".to_string()); }
    let client = Client::new();
    let token_res = client
        .post("https://id.twitch.tv/oauth2/token")
        .form(&[
            ("client_id", client_id.as_str()),
            ("grant_type", "authorization_code"),
            ("code", code.as_str()),
            ("redirect_uri", redirect_uri.as_str()),
            ("code_verifier", code_verifier.as_str()),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<TokenResponse>()
        .await
        .map_err(|e| e.to_string())?;

    let validate = client
        .get("https://id.twitch.tv/oauth2/validate")
        .bearer_auth(&token_res.access_token)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<ValidateResponse>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(LoginResult {
        access_token: token_res.access_token,
        token_type: token_res.token_type,
        expires_in: token_res.expires_in,
        scope: validate.scopes,
        login: validate.login,
        client_id,
    })
}
