import { SignJWT, jwtVerify } from "jose";
import { getConfig } from "@sonrat/config";
import { generateToken } from "./crypto.js";

function secretKey() {
  return new TextEncoder().encode(getConfig().AUTH_SECRET);
}

/** Create a signed session token embedding a random session secret. */
export async function createSignedSessionToken(): Promise<{
  token: string;
  rawSecret: string;
}> {
  const rawSecret = generateToken();
  const token = await new SignJWT({ sid: rawSecret })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${getConfig().AUTH_SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
  return { token, rawSecret };
}

export async function verifySignedSessionToken(
  token: string,
): Promise<{ rawSecret: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const sid = payload.sid;
    if (typeof sid !== "string") return null;
    return { rawSecret: sid };
  } catch {
    return null;
  }
}
