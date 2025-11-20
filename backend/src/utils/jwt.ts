import * as jose from 'jose';
import type { JWTPayload } from '../types';

export async function generateJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const jwt = await new jose.SignJWT({
    userId: payload.userId,
    email: payload.email,
    tier: payload.tier,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey);

  return jwt;
}

export async function verifyJWT(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const { payload } = await jose.jwtVerify(token, secretKey);

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      tier: payload.tier as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}
