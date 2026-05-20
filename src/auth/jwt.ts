import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { parseDurationSeconds } from "../common/date.js";

export type JwtPayload = {
  sub: string;
  tokenId?: number;
};

export function signAccessToken(userId: number) {
  return jwt.sign({ sub: String(userId) }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"]
  });
}

export function signRefreshToken(userId: number, tokenId: number) {
  return jwt.sign({ sub: String(userId), tokenId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL as jwt.SignOptions["expiresIn"]
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}

export function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshExpiresAt() {
  return new Date(Date.now() + parseDurationSeconds(env.REFRESH_TOKEN_TTL) * 1000);
}
