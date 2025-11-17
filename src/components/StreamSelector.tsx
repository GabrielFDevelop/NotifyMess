import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { createClient, parseChannel } from "../lib/twitch";
import { useToast } from "./ui/toast";

interface StreamSelectorProps {
  onConnect: (channel: string, client: any) => void;
  onDisconnect: () => void;
  connectedChannel?: string | null;
}

export default function StreamSelector({ onConnect, onDisconnect, connectedChannel }: StreamSelectorProps) {
  const [value, setValue] = useState("");
  const [connecting, setConnecting] = useState(false);
  const { show } = useToast();
  const login = typeof window !== "undefined" ? (localStorage.getItem("twitchLogin") || "") : "";

  const handleConnect = async () => {
    const channel = parseChannel(value);
    if (!channel) return;
    setConnecting(true);
    const client = createClient(channel);
    try {
      await client.connect();
      onConnect(channel, client);
      show({ title: "Conectado", description: channel, variant: "success" });
    } catch (e: any) {
      show({ title: "Erro ao conectar", description: String(e?.message || e), variant: "error" });
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectRust = async () => {
    const channel = parseChannel(value);
    if (!channel) return;
    setConnecting(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("start_twitch_chat", { channel });
      onConnect(channel, null);
      show({ title: "Conectado (Rust)", description: channel, variant: "success" });
    } finally {
      setConnecting(false);
    }
  };

  const useMyChannel = () => {
    if (!login) {
      show({ title: "Usuário não vinculado", description: "Faça login com a Twitch primeiro", variant: "error" });
      return;
    }
    setValue(login);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="link ou nome do canal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {connectedChannel ? (
        <Button variant="secondary" onClick={() => { onDisconnect(); show({ title: "Desconectado", description: connectedChannel || "", variant: "info" }); }}>Desconectar</Button>
      ) : (
        <>
          <Button className="mr-2" variant="surface" onClick={useMyChannel} disabled={!login}>Meu canal</Button>
          <Button onClick={handleConnect} disabled={connecting}>Conectar (JS)</Button>
          <Button onClick={handleConnectRust} disabled={connecting} className="ml-2">Conectar (Rust)</Button>
        </>
      )}
    </div>
  );
}