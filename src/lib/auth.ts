import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getAuthUser } from "@/lib/store";

export const SESSION_COOKIE = "px_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set.");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function createSessionToken(): string {
  const payload = String(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  return `${payload}.${sign(payload)}`;
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  if (!timingSafeEqualStr(sig, sign(payload))) return false;
  return Number(payload) > Date.now();
}

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

export function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;
  const usernameOk = timingSafeEqualStr(user.username, username);
  const hashOk = timingSafeEqualStr(user.hash, hashPassword(password, user.salt));
  return usernameOk && hashOk;
}

export const SESSION_COOKIE_MAX_AGE = SESSION_MAX_AGE_SECONDS;
