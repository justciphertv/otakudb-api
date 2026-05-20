import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { signAccessToken, verifyAccessToken } from "../auth/jwt.js";

describe("auth primitives", () => {
  it("hashes and verifies passwords with argon2id", async () => {
    const hash = await hashPassword("password123");
    await expect(verifyPassword(hash, "password123")).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong-password")).resolves.toBe(false);
  });

  it("signs JWT access tokens", () => {
    const token = signAccessToken(42);
    expect(verifyAccessToken(token).sub).toBe("42");
  });
});
