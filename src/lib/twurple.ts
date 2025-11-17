import { ApiClient } from "@twurple/api";
import { StaticAuthProvider } from "@twurple/auth";

export async function createApiClient(): Promise<ApiClient | null> {
  const clientId = localStorage.getItem("twitchClientId") || undefined;
  const token = localStorage.getItem("twitchToken") || undefined;
  if (!clientId || !token) return null;
  const authProvider = new StaticAuthProvider(clientId, token);
  return new ApiClient({ authProvider });
}

export async function deleteChatMessage(channelLogin: string, messageId: string): Promise<boolean> {
  const api = await createApiClient();
  if (!api) return false;
  const user = await api.users.getUserByName(channelLogin);
  if (!user) return false;
  await api.moderation.deleteChatMessages(user.id, messageId);
  return true;
}

export type UserAccessInfo = {
  userId: string;
  userLogin: string;
  userName: string;
  roles: { broadcaster: boolean; moderator: boolean; vip: boolean; editor: boolean };
  scopes: string[];
};

export type CurrentUser = {
  id: string;
  login: string;
  displayName: string;
  profileImageUrl?: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const clientId = localStorage.getItem("twitchClientId") || undefined;
  const token = localStorage.getItem("twitchToken") || undefined;
  const login = localStorage.getItem("twitchLogin") || undefined;
  if (!clientId || !token || !login) return null;
  try {
    const raw = localStorage.getItem("twitchUser");
    if (raw) {
      const me = JSON.parse(raw);
      return {
        id: String(me.id),
        login: String(me.login),
        displayName: String(me.display_name || me.displayName || me.login),
        profileImageUrl: me.profile_image_url ? String(me.profile_image_url) : undefined,
      };
    }
  } catch {}
  const headers = { Authorization: `Bearer ${token}`, "Client-Id": clientId } as const;
  const meRes = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, { headers });
  if (!meRes.ok) return null;
  const meData = await meRes.json();
  const me = meData?.data?.[0];
  if (!me) return null;
  try { localStorage.setItem("twitchUser", JSON.stringify(me)); } catch {}
  return {
    id: String(me.id),
    login: String(me.login),
    displayName: String(me.display_name || me.displayName || me.login),
    profileImageUrl: me.profile_image_url ? String(me.profile_image_url) : undefined,
  };
}

export async function getAccessInfo(channelLogin: string): Promise<UserAccessInfo | null> {
  const clientId = localStorage.getItem("twitchClientId") || undefined;
  const token = localStorage.getItem("twitchToken") || undefined;
  const login = localStorage.getItem("twitchLogin") || undefined;
  if (!clientId || !token || !login) return null;
  const headers = { Authorization: `Bearer ${token}`, "Client-Id": clientId } as const;
  const usersRes = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(channelLogin)}`, { headers });
  const usersData = await usersRes.json();
  const channelUser = usersData?.data?.[0];
  if (!channelUser) return null;
  const meRes = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, { headers });
  const meData = await meRes.json();
  const me = meData?.data?.[0];
  if (!me) return null;
  const broadcaster = String(me.id) === String(channelUser.id);
  let moderator = false;
  try {
    const modChRes = await fetch(`https://api.twitch.tv/helix/moderation/channels?user_id=${encodeURIComponent(me.id)}`, { headers });
    if (modChRes.ok) {
      const modChData = await modChRes.json();
      const list: any[] = Array.isArray(modChData?.data) ? modChData.data : [];
      moderator = list.some((x) => String(x.broadcaster_id) === String(channelUser.id));
    }
  } catch {}
  let vip = false;
  try {
    if (broadcaster) {
      const vipRes = await fetch(`https://api.twitch.tv/helix/channels/vips?broadcaster_id=${encodeURIComponent(channelUser.id)}&user_id=${encodeURIComponent(me.id)}`, { headers });
      if (vipRes.ok) {
        const vipData = await vipRes.json();
        const list: any[] = Array.isArray(vipData?.data) ? vipData.data : [];
        vip = list.length > 0;
      }
    }
  } catch {}
  let editor = false;
  try {
    if (broadcaster) {
      const edRes = await fetch(`https://api.twitch.tv/helix/channels/editors?broadcaster_id=${encodeURIComponent(channelUser.id)}`, { headers });
      if (edRes.ok) {
        const edData = await edRes.json();
        const list: any[] = Array.isArray(edData?.data) ? edData.data : [];
        editor = list.some((e) => String(e.user_id) === String(me.id));
      }
    }
  } catch {}
  let scopes: string[] = [];
  try {
    const raw = localStorage.getItem("twitchScopes");
    scopes = raw ? JSON.parse(raw) : [];
  } catch {}
  return {
    userId: String(me.id),
    userLogin: String(me.login),
    userName: String(me.display_name || me.displayName || me.login),
    roles: { broadcaster, moderator, vip, editor },
    scopes,
  };
}