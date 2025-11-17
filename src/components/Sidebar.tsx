import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import { MessageSquare, Settings, User } from "lucide-react";

interface SidebarProps {
  active: "config" | "chat" | "account";
  onOpenChat: () => void;
  onOpenConfig: () => void;
  onOpenAccount: () => void;
  channel?: string | null;
  canModerate?: boolean;
  hidden?: boolean;
  severityTotals?: { cuidado: number; perigosa: number; urgente: number };
}

export default function Sidebar({ active, onOpenChat, onOpenConfig, onOpenAccount, channel, canModerate, hidden, severityTotals }: SidebarProps) {
  return (
    <aside className={cn("sidebar", hidden ? "is-hidden" : undefined)}>
      <div className="sidebar-content">
        <div className="sidebar-title">Navegação</div>
        <div className="sidebar-card">
          <div className="sidebar-card-inner">
            <span className="text-xs" style={{ color: "var(--textMuted)" }}>Moderação</span>
            <Badge className="badge" variant="default">{canModerate ? "ativa" : "desativada"}</Badge>
          </div>
        </div>
        <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {active === "chat" ? (
            <Button className={cn("button", "button-surface")} onClick={onOpenChat}>
              <span style={{ borderRadius: "var(--radius-md)", background: "var(--inputBorder)", padding: "var(--space-1)" }}>
                <MessageSquare size={16} />
              </span>
              <span style={{ marginLeft: "var(--space-2)" }}>Chat em tempo real</span>
            </Button>
          ) : (
            <button className="button button-secondary" onClick={onOpenChat}>
              <span style={{ borderRadius: "var(--radius-md)", background: "var(--inputBorder)", padding: "var(--space-1)", marginRight: "var(--space-2)" }}>
                <MessageSquare size={16} />
              </span>
              <span>Chat em tempo real</span>
            </button>
          )}
          {channel && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
              <Badge>{channel}</Badge>
              {!!(severityTotals && severityTotals.cuidado > 0) && (
                <span className="indicator-round indicator-cuidado">{severityTotals.cuidado}</span>
              )}
              {!!(severityTotals && severityTotals.perigosa > 0) && (
                <span className="indicator-round indicator-perigosa">{severityTotals.perigosa}</span>
              )}
              {!!(severityTotals && severityTotals.urgente > 0) && (
                <span className="indicator-round indicator-urgente">{severityTotals.urgente}</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="sidebar-footer">
        <Button
          className={cn("button", active === "account" ? "button-surface" : "button-secondary")}
          onClick={onOpenAccount}
        >
          <span style={{ borderRadius: "var(--radius-md)", background: "var(--inputBorder)", padding: "var(--space-1)" }}>
            <User size={16} />
          </span>
          <span style={{ marginLeft: "var(--space-2)" }}>Minha conta</span>
        </Button>
        <Button
          className={cn("button", active === "config" ? "button-surface" : "button-secondary")}
          onClick={onOpenConfig}
        >
          <span style={{ borderRadius: "var(--radius-md)", background: "var(--inputBorder)", padding: "var(--space-1)" }}>
            <Settings size={16} />
          </span>
          <span style={{ marginLeft: "var(--space-2)" }}>Configurações</span>
        </Button>
      </div>
    </aside>
  );
}
