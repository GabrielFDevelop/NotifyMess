import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { listen } from "@tauri-apps/api/event";
import { useToast } from "./ui/toast";

export default function LoginWithTwitch() {
  const [loading, setLoading] = useState(false);
  const isTauri = useMemo(() => typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__, []);
  const { show } = useToast();

  useEffect(() => {
    if (!isTauri) return;
    const p = listen("auth://twitch_authorize_url", async (e) => {
      const url = String(e.payload);
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("plugin:opener|open", { path: url });
      } catch {
        try {
          window.open(url, "_blank");
        } catch {}
      }
    });
    return () => { p.then((un) => un()); };
  }, [isTauri]);

  const startLogin = async () => {
    if (!isTauri) return;
    setLoading(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      let clientId = String(localStorage.getItem("twitchClientId") || "");
      if (!clientId) {
        const input = window.prompt("Informe o Client ID da aplicação Twitch (não é segredo)") || "";
        clientId = input.trim();
        if (clientId) {
          try { localStorage.setItem("twitchClientId", clientId); } catch {}
        }
      }
      const res = await invoke<any>("twitch_login_pkce", { client_id: clientId || null });
      if (res && res.access_token && res.login) {
        localStorage.setItem("twitchToken", String(res.access_token));
        localStorage.setItem("twitchLogin", String(res.login).toLowerCase());
        try { localStorage.setItem("twitchScopes", JSON.stringify(res.scope || [])); } catch {}
        try { localStorage.setItem("twitchClientId", String(res.client_id || "")); } catch {}
        try {
          const clientId = String(res.client_id || localStorage.getItem("twitchClientId") || "");
          if (clientId) {
            const headers = { Authorization: `Bearer ${String(res.access_token)}`, "Client-Id": clientId } as const;
            const meRes = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(String(res.login))}`, { headers });
            if (meRes.ok) {
              const meData = await meRes.json();
              const me = meData?.data?.[0];
              if (me) {
                localStorage.setItem("twitchUser", JSON.stringify(me));
              }
            }
          }
        } catch {}
        show({ title: "Login concluído", description: `Bem-vindo ${String(res.login)}`, variant: "success" });
      }
    } catch (e: any) {
      // Fallback: abrir página de login padrão se OAuth não estiver configurado
      const msg = String(e?.message || e);
      if (/Twitch OAuth não configurado/i.test(msg)) {
        try { window.open("https://www.twitch.tv/login", "_blank"); } catch {}
        show({ title: "Login via web", description: "Abrimos a página de login da Twitch.", variant: "info" });
      } else {
        show({ title: "Falha no login", description: msg, variant: "error" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="surface" onClick={startLogin} disabled={loading || !isTauri}>Vincular usuário da Twitch</Button>
    </div>
  );
}