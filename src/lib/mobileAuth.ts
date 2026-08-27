import { SignJWT, jwtVerify } from 'jose';

import type { AppUser } from './credentials';

// A plain bearer token for the mobile app. NextAuth's own session is
// cookie-based, which fights a bare React Native fetch call; this is the
// separate, simpler mechanism the phone actually uses, backed by the
// same users table and the same secret NextAuth already has.
const secretKey = () => new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

const MOBILE_TOKEN_TTL = '90d';

export async function signMobileToken(user: AppUser): Promise<string> {
  return new SignJWT({ username: user.username, displayName: user.displayName })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(MOBILE_TOKEN_TTL)
    .sign(secretKey());
}

export type MobileTokenPayload = {
  userId: number;
  username: string;
  displayName: string;
};

export async function verifyMobileToken(token: string): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== 'string' || typeof payload.username !== 'string') return null;
    return {
      userId: Number(payload.sub),
      username: payload.username as string,
      displayName: (payload.displayName as string) ?? (payload.username as string),
    };
  } catch {
    return null;
  }
}

// For route handlers that require a logged-in mobile user: pull the
// bearer token out of the request, verify it, and return the payload —
// or null if the request isn't authenticated.
export async function requireMobileAuth(request: Request): Promise<MobileTokenPayload | null> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return verifyMobileToken(header.slice('Bearer '.length));
}
