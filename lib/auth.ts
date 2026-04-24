import { cookies } from "next/headers";

const COOKIE_NAME = "voglia_admin";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function checkPassword(password: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("ADMIN_PASSWORD not set");
  return password === expected;
}

export async function signIn(password: string): Promise<boolean> {
  if (!(await checkPassword(password))) return false;
  const secret = process.env.ADMIN_PASSWORD!;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return true;
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value === expected;
}

export { COOKIE_NAME };
