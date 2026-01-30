import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  userId: string;
  type?: 'access' | 'refresh';
}

export function generateAccessToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'access' } as TokenPayload,
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as any
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' } as TokenPayload,
    config.jwtSecret,
    { expiresIn: config.jwtRefreshExpiresIn } as any
  );
}

export function generateTokens(userId: string): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId),
  };
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}
