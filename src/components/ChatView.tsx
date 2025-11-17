import { useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import type { ChatMessage } from "../lib/twitch";
import type { AlertWord } from "./AlertManager";

type ActionType = "timeout" | "banimento" | "aviso" | "eliminar";

interface ChatViewProps {
  client: any | null;
  channel?: string | null;
  alerts: AlertWord[];
  canModerate: boolean;
  onAction: (action: ActionType, user: string, messageId?: string) => void;
}

export default function ChatView({ client, channel, alerts, canModerate, onAction }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const seenIds = useRef<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!client) return;
    const handler = (channel: string, tags: any, message: string, self: boolean) => {
      if (self) return;
      const id = tags.id || `${Date.now()}-${Math.random()}`;
      if (seenIds.current.has(id)) return;
      seenIds.current.add(id);
      const user = tags["display-name"] || tags.username || "";
      const item: ChatMessage = { id, channel, user, message, timestamp: Date.now() };
      setMessages((prev) => [...prev, item]);
    };
    client.on("message", handler);
    return () => {
      client.removeListener("message", handler);
    };
  }, [client]);

  useEffect(() => {
    if (client || !channel) return;
    const unlistenPromise = listen("twitch://chat_message", (event) => {
      const payload = event.payload as any;
      const id = String(payload.id ?? `${Date.now()}-${Math.random()}`);
      if (seenIds.current.has(id)) return;
      seenIds.current.add(id);
      const item: ChatMessage = {
        id,
        channel: String(payload.channel ?? ""),
        user: String(payload.user ?? ""),
        message: String(payload.message ?? ""),
        timestamp: Number(payload.timestamp ?? Date.now()),
      };
      setMessages((prev) => [...prev, item]);
    });
    return () => {
      unlistenPromise.then((un) => un());
    };
  }, [client, channel]);

  useEffect(() => {
    if (!client && !channel) {
      seenIds.current.clear();
      setMessages([]);
    }
  }, [client, channel]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const patterns = useMemo(() => {
    return alerts.map((a) => ({
      ...a,
      regex: new RegExp(`(^|\\b)${escapeRegex(a.word)}(\\b|$)`, "i"),
    }));
  }, [alerts]);

  const highlightFor = (text: string) => {
    for (const p of patterns) if (p.regex.test(text)) return p.type;
    return undefined;
  };

  const colorFor = (type?: string) => {
    if (type === "cuidado") return "chat-cuidado";
    if (type === "perigosa") return "chat-perigosa";
    if (type === "urgente") return "chat-urgente";
    return "chat-default";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div ref={listRef} className="chat-list">
        <div className="chat-space">
          {messages.map((m) => {
            const type = highlightFor(m.message);
            const isRemoved = removedIds.has(m.id);
            return (
              <div key={m.id} className={`chat-item ${colorFor(type)}`}>
                <div className="chat-toolbar">
                  <div className="chat-toolbar-left">
                    <span className="text-sm text-gray-300">{m.user}</span>
                    {type && (
                      <Badge variant={badgeVariant(type)}>{type}</Badge>
                    )}
                  </div>
                  <div className="chat-toolbar-right">
                    <Button size="sm" disabled={!canModerate} onClick={() => onAction("timeout", m.user, m.id)}>timeout</Button>
                    <Button size="sm" disabled={!canModerate} onClick={() => onAction("banimento", m.user, m.id)}>banir</Button>
                    <Button size="sm" disabled={!canModerate} onClick={() => onAction("aviso", m.user, m.id)}>aviso</Button>
                    <Button size="sm" onClick={() => { setRemovedIds((prev) => new Set([...prev, m.id])); onAction("eliminar", m.user, m.id); }}>remover</Button>
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-200">
                  {isRemoved ? <span className="italic text-gray-500">mensagem removida</span> : m.message}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function badgeVariant(type: string) {
  if (type === "cuidado") return "warning" as const;
  if (type === "perigosa") return "danger" as const;
  if (type === "urgente") return "urgent" as const;
  return "default" as const;
}
