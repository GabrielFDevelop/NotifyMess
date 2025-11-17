import tmi from "tmi.js";

export type ChatMessage = {
  id: string;
  channel: string;
  user: string;
  message: string;
  timestamp: number;
};

export function parseChannel(input: string) {
  const trimmed = input.trim();
  const match = trimmed.match(/twitch\.tv\/(?:videos\/\d+|.+\/)??([A-Za-z0-9_]+)/i);
  if (match && match[1]) return match[1].toLowerCase();
  if (/^[A-Za-z0-9_]+$/.test(trimmed)) return trimmed.toLowerCase();
  return null;
}

export function createAnonymousClient(channel: string) {
  const client = new tmi.Client({
    options: { debug: false },
    connection: { reconnect: true, secure: true },
    channels: [channel],
  });
  return client;
}

export function createClient(channel: string) {
  try {
    const login = localStorage.getItem("twitchLogin") || undefined;
    const token = localStorage.getItem("twitchToken") || undefined;
    const identity = login && token ? { username: login, password: `oauth:${token}` } : undefined;
    const client = new tmi.Client({
      options: { debug: false },
      connection: { reconnect: true, secure: true },
      identity,
      channels: [channel],
    });
    return client;
  } catch {
    return createAnonymousClient(channel);
  }
}