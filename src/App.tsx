import { useEffect, useMemo, useState } from "react";
import StreamSelector from "./components/StreamSelector";
import AlertManager, { type AlertWord } from "./components/AlertManager";
import ChatView from "./components/ChatView";
import ModerationPanel from "./components/ModerationPanel";
import { Button } from "./components/ui/button";
import Sidebar from "./components/Sidebar";
import LoginWithTwitch from "./components/LoginWithTwitch";
import { deleteChatMessage, getAccessInfo, getCurrentUser, type UserAccessInfo } from "./lib/twurple";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import { Link, AlertCircle, Shield, Users, Menu } from "lucide-react";

type Counts = { danger: number; urgent: number; cuidado: number };

export default function App() {
  const [channel, setChannel] = useState<string | null>(null);
  const [client, setClient] = useState<any | null>(null);
  const [canModerate, setCanModerate] = useState(false);
  const [active, setActive] = useState<"config" | "chat" | "account">("config");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [alerts, setAlerts] = useState<AlertWord[]>(() => {
    try {
      const raw = localStorage.getItem("alerts");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [dangerThreshold, setDangerThreshold] = useState(2);
  const [urgentThreshold, setUrgentThreshold] = useState(1);
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [severityTotals, setSeverityTotals] = useState<{ cuidado: number; perigosa: number; urgente: number }>({ cuidado: 0, perigosa: 0, urgente: 0 });
  const [accessInfo, setAccessInfo] = useState<UserAccessInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<{ login: string; displayName: string; avatar?: string } | null>(null);
  const suspiciousUsers = useMemo(() => {
    return Object.entries(counts)
      .filter(([_, c]) => c.urgent >= urgentThreshold || c.danger >= dangerThreshold)
      .map(([u]) => u);
  }, [counts, dangerThreshold, urgentThreshold]);

  useEffect(() => {
    localStorage.setItem("alerts", JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    const applyInitial = () => {
      const w = window.innerWidth;
      setSidebarOpen(w > 1024);
    };
    applyInitial();
    const onResize = () => applyInitial();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    (async () => {
      const me = await getCurrentUser();
      if (me) setCurrentUser({ login: me.login, displayName: me.displayName, avatar: me.profileImageUrl });
    })();
  }, []);

  useEffect(() => {
    if (!client) return;
    const handler = (_channel: string, tags: any, message: string) => {
      const user = tags["display-name"] || tags.username || "";
      const lower = message.toLowerCase();
      const hit = alerts.find((a) => new RegExp(`(^|\\b)${escapeRegex(a.word)}(\\b|$)`, "i").test(lower));
      if (hit) {
        setCounts((prev) => {
          const cur = prev[user] || { danger: 0, urgent: 0, cuidado: 0 };
          const next: Counts = {
            danger: cur.danger + (hit.type === "perigosa" ? 1 : 0),
            urgent: cur.urgent + (hit.type === "urgente" ? 1 : 0),
            cuidado: cur.cuidado + (hit.type === "cuidado" ? 1 : 0),
          };
          return { ...prev, [user]: next };
        });
        setSeverityTotals((prev) => ({
          cuidado: prev.cuidado + (hit.type === "cuidado" ? 1 : 0),
          perigosa: prev.perigosa + (hit.type === "perigosa" ? 1 : 0),
          urgente: prev.urgente + (hit.type === "urgente" ? 1 : 0),
        }));
      }
    };
    client.on("message", handler);
    return () => client.removeListener("message", handler);
  }, [client, alerts]);

  useEffect(() => {
    if (!client || !channel) return;
    const onUserState = (_ch: string, state: any) => {
      const badges = state?.badges as Record<string, string> | undefined;
      const isBroadcaster = badges?.broadcaster === "1";
      const isModerator = state?.mod === true || badges?.moderator === "1";
      setCanModerate(Boolean(isBroadcaster || isModerator));
    };
    client.on("userstate", onUserState);
    return () => client.removeListener("userstate", onUserState);
  }, [client, channel]);

  const onConnect = (ch: string, c: any) => {
    setChannel(ch);
    setClient(c);
    setSeverityTotals({ cuidado: 0, perigosa: 0, urgente: 0 });
    getAccessInfo(ch).then((info) => {
      setAccessInfo(info);
      if (info && info.roles) setCanModerate(Boolean(info.roles.broadcaster || info.roles.moderator));
    }).catch(() => {});
  };

  const onDisconnect = async () => {
    try {
      await client?.disconnect();
    } finally {
      setClient(null);
      setChannel(null);
      setCanModerate(false);
      setAccessInfo(null);
      setSeverityTotals({ cuidado: 0, perigosa: 0, urgente: 0 });
    }
  };

  const onAction = async (
    action: "timeout" | "banimento" | "aviso" | "eliminar",
    _user: string,
    messageId?: string
  ) => {
    if (!channel) return;
    void _user;
    if (action === "eliminar" && messageId) {
      const ok = await deleteChatMessage(channel, messageId);
      if (ok && client?.say) {
        try {
          await client.say(channel, "Mensagem removida por moderador");
        } catch {}
      }
    }
  };

  return (
    <div className="app">
      <Sidebar
        active={active}
        onOpenChat={() => setActive("chat")}
        onOpenConfig={() => setActive("config")}
        onOpenAccount={() => setActive("account")}
        channel={channel}
        canModerate={canModerate}
        hidden={!sidebarOpen}
        severityTotals={severityTotals}
      />
      <div className="page">
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Button className="button button-secondary button-sm header-toggle" onClick={() => setSidebarOpen((v) => !v)}>
            <Menu size={16} />
          </Button>
          <div>
            <div className="header-title">NotifyMess</div>
            <div className="header-subtitle">Sistema de Moderação de Chat</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {currentUser && (
            <span className="text-xs" style={{ color: "var(--textMuted)", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
              {currentUser.avatar && (
                <img src={currentUser.avatar} alt="avatar" style={{ width: 20, height: 20, borderRadius: "50%" }} />
              )}
              {currentUser.displayName}
            </span>
          )}
          {channel && <span className="text-sm text-gray-400">canal: {channel}</span>}
          {accessInfo && (
            <span className="text-xs" style={{ color: "var(--textMuted)" }}>
              você: {[
                accessInfo.roles.broadcaster ? "dono" : null,
                accessInfo.roles.moderator ? "moderador" : null,
                accessInfo.roles.vip ? "vip" : null,
                accessInfo.roles.editor ? "editor" : null,
              ].filter(Boolean).join(", ") || "visitante"}
            </span>
          )}
        </div>
      </header>
      <main className="content">
        <div style={{ padding: "var(--space-4)", minHeight: "100vh", overflowY: "auto" }}>
          {active === "config" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-4)" }}>
              <Card>
                <CardHeader>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <Link size={18} style={{ color: "var(--accent)" }} />
                    <CardTitle>Conexão</CardTitle>
                  </div>
                  <div className="text-xs" style={{ color: "var(--textMuted)" }}>Configure a conexão com o canal de chat</div>
                </CardHeader>
                <CardContent>
                  <div className="grid-2">
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                      <Label>Conta da Twitch</Label>
                      <LoginWithTwitch />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                      <Label>Link ou nome do canal</Label>
                      <StreamSelector onConnect={onConnect} onDisconnect={onDisconnect} connectedChannel={channel} />
                    </div>
                  </div>
                  <div style={{ marginTop: "var(--space-3)" }}>
                    <Button variant="secondary" disabled>Nova aba (futuro)</Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <AlertCircle size={18} style={{ color: "#f59e0b" }} />
                    <CardTitle>Palavras de Alerta</CardTitle>
                  </div>
                  <div className="text-xs" style={{ color: "var(--textMuted)" }}>Gerencie palavras que acionam alertas de moderação</div>
                </CardHeader>
                <CardContent>
                  <AlertManager alerts={alerts} onChange={setAlerts} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <Shield size={18} style={{ color: "var(--accent)" }} />
                    <CardTitle>Moderação</CardTitle>
                  </div>
                  <div className="text-xs" style={{ color: "var(--textMuted)" }}>Configure os limites de ação automática</div>
                </CardHeader>
                <CardContent>
                  <ModerationPanel
                    dangerThreshold={dangerThreshold}
                    urgentThreshold={urgentThreshold}
                    onChange={(d, u) => {
                      setDangerThreshold(d);
                      setUrgentThreshold(u);
                    }}
                    suspiciousUsers={suspiciousUsers}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <Users size={18} style={{ color: "var(--accent)" }} />
                    <CardTitle>Usuários Suspeitos</CardTitle>
                  </div>
                  <div className="text-xs" style={{ color: "var(--textMuted)" }}>Lista de usuários para monitoramento especial</div>
                </CardHeader>
                <CardContent>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    <Label>Lista de usuários</Label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr" }}>
                      <Input placeholder="Digite nomes de usuários separados por vírgula" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {active === "account" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-4)" }}>
              <Card>
                <CardHeader>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <Users size={18} style={{ color: "var(--accent)" }} />
                    <CardTitle>Minha conta</CardTitle>
                  </div>
                  <div className="text-xs" style={{ color: "var(--textMuted)" }}>Informações da conta vinculada</div>
                </CardHeader>
                <CardContent>
                  <div className="grid-2">
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      {currentUser?.avatar && (
                        <img src={currentUser.avatar} alt="avatar" style={{ width: 64, height: 64, borderRadius: "50%" }} />
                      )}
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600 }}>{currentUser?.displayName || "Não vinculado"}</span>
                        {currentUser?.login && <span style={{ color: "var(--textMuted)" }}>@{currentUser.login}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                      <Label>Escopos</Label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                        {(accessInfo?.scopes || (JSON.parse(localStorage.getItem("twitchScopes") || "[]") as string[])).map((s) => (
                          <Badge key={s}>{s}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "var(--space-4)" }} className="grid-2">
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                      <Label>Cargos no canal atual</Label>
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <Badge variant={accessInfo?.roles.broadcaster ? "urgent" : "default"}>dono</Badge>
                        <Badge variant={accessInfo?.roles.moderator ? "danger" : "default"}>moderador</Badge>
                        <Badge variant={accessInfo?.roles.vip ? "warning" : "default"}>vip</Badge>
                        <Badge variant={accessInfo?.roles.editor ? "warning" : "default"}>editor</Badge>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                      <Label>Ações</Label>
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <Button variant="secondary" onClick={() => {
                          try {
                            localStorage.removeItem("twitchToken");
                            localStorage.removeItem("twitchLogin");
                            localStorage.removeItem("twitchClientId");
                            localStorage.removeItem("twitchScopes");
                          } catch {}
                          setCurrentUser(null);
                          setAccessInfo(null);
                          setCanModerate(false);
                        }}>Desvincular conta</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {active === "chat" && (
            <Card>
              <CardHeader>
                <CardTitle>Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <ChatView
                  client={client}
                  channel={channel}
                  alerts={alerts}
                  canModerate={canModerate}
                  onAction={onAction}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      </div>
    </div>
  );
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
