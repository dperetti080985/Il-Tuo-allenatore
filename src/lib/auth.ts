import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export type SessionPayload = {
  userId: string;
  role: "COACH" | "ATHLETE";
  email: string;
};

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(SECRET);
}

export async function getSession() {
  const token = cookies().get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
