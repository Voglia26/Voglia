import { cookies } from "next/headers";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppUser, AppUserRole } from "@/lib/types";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
  encodeSessionCookie,
  decodeSessionCookie,
  type SessionPayload,
} from "@/lib/session-cookie";

export type SessionUser = {
  id: string;
  role: AppUserRole;
  displayName: string;
  username: string;
};

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(password, salt, 64);
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

async function setSessionCookie(user: {
  id: string;
  role: AppUserRole;
  display_name: string;
}) {
  const token = await encodeSessionCookie({
    sub: user.id,
    role: user.role,
    name: user.display_name,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SEC,
    path: "/",
  });
  // Clear legacy password cookie if present
  cookieStore.delete("voglia_admin");
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const payload = await decodeSessionCookie(
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );
  if (!payload) return null;
  return {
    id: payload.sub,
    role: payload.role,
    displayName: payload.name,
    username: "",
  };
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decodeSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

/** Any valid signed session (admin or seller). */
export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null;
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "admin";
}

export async function requireAdmin(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function requireSeller(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session || (session.role !== "seller" && session.role !== "admin")) {
    return null;
  }
  return session;
}

export async function signIn(
  username: string,
  password: string
): Promise<{ ok: true; role: AppUserRole } | { ok: false }> {
  const normalized = username.trim().toLowerCase();
  if (!normalized || !password) return { ok: false };

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_users")
    .select("id, username, password_hash, display_name, role, active")
    .eq("username", normalized)
    .maybeSingle();

  const user = data as AppUser | null;
  if (!user || !user.active) return { ok: false };

  const adminEnvPassword = process.env.ADMIN_PASSWORD?.trim();
  const envOk =
    user.role === "admin" &&
    !!adminEnvPassword &&
    password === adminEnvPassword;

  const hashOk = verifyPassword(password, user.password_hash);
  if (!envOk && !hashOk) return { ok: false };

  // Keep DB hash in sync when admin logs in with ADMIN_PASSWORD
  if (envOk && !hashOk) {
    await supabase
      .from("app_users")
      .update({ password_hash: hashPassword(password) })
      .eq("id", user.id);
  }

  await setSessionCookie(user);
  return { ok: true, role: user.role };
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete("voglia_admin");
}

export { hashPassword, SESSION_COOKIE_NAME };
