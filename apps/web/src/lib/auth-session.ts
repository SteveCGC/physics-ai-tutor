export type UserRole = "teacher" | "student";

export interface AuthUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user: AuthUser;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  avatar?: string | null;
  school?: string | null;
  classId?: string | null;
  status?: string;
}

const FALLBACK_COOKIE_NAME = "sb-auth-token";
const STORAGE_KEY = "physics-ai-tutor.auth.session";

export function getSupabaseProjectRef(url?: string) {
  if (!url) {
    return null;
  }

  try {
    const hostname = new URL(url).hostname;
    return hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

export function getSupabaseCookieName(url?: string) {
  const projectRef = getSupabaseProjectRef(url);
  return projectRef ? `sb-${projectRef}-auth-token` : FALLBACK_COOKIE_NAME;
}

export function isSessionExpired(session: AuthSession | null): boolean {
  if (!session?.expires_at) {
    return false;
  }
  return Date.now() / 1000 > session.expires_at;
}

export function getRoleFromSession(session: AuthSession | null): UserRole | null {
  const rawRole =
    session?.user.user_metadata?.role ?? session?.user.app_metadata?.role;

  return rawRole === "teacher" || rawRole === "student" ? rawRole : null;
}

export function serializeSession(session: AuthSession) {
  return encodeURIComponent(JSON.stringify(session));
}

export function parseSession(value?: string | null): AuthSession | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as AuthSession;
  } catch {
    return null;
  }
}

export function readSessionFromCookieString(cookieHeader: string, cookieName: string) {
  const entries = cookieHeader.split(";").map((part) => part.trim());
  const matched = entries.find((entry) => entry.startsWith(`${cookieName}=`));
  return parseSession(matched?.slice(cookieName.length + 1));
}

export function persistSession(session: AuthSession, supabaseUrl?: string) {
  if (typeof document === "undefined") {
    return;
  }

  const cookieName = getSupabaseCookieName(supabaseUrl);
  const encoded = serializeSession(session);
  const maxAge = session.expires_in ?? 60 * 60 * 24 * 7;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  document.cookie = `${cookieName}=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function clearPersistedSession(supabaseUrl?: string) {
  if (typeof document === "undefined") {
    return;
  }

  const cookieName = getSupabaseCookieName(supabaseUrl);
  localStorage.removeItem(STORAGE_KEY);
  document.cookie = `${cookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getStoredSession(supabaseUrl?: string): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const fromStorage = parseSession(localStorage.getItem(STORAGE_KEY));
  if (fromStorage) {
    return fromStorage;
  }

  const cookieName = getSupabaseCookieName(supabaseUrl);
  return readSessionFromCookieString(document.cookie, cookieName);
}
