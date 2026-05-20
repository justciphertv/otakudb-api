import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../common/errors.js";
import { sanitizeText } from "../common/sanitize.js";
import { hashPassword, verifyPassword } from "./password.js";
import { refreshExpiresAt, signAccessToken, signRefreshToken, tokenHash } from "./jwt.js";

const credentialsSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(200)
});

const registerSchema = credentialsSchema.extend({
  name: z.string().min(2).max(40).regex(/^[a-zA-Z0-9_-]+$/)
});

export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async register(input: z.infer<typeof registerSchema>) {
    const data = registerSchema.parse(input);
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: data.email.toLowerCase() }, { name: data.name }] }
    });
    if (exists) throw new AppError("Email or username is already registered", "CONFLICT", 409);

    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: sanitizeText(data.name) ?? data.name,
        passwordHash: await hashPassword(data.password)
      }
    });
    return this.issueTokens(user.id);
  }

  async login(input: z.infer<typeof credentialsSchema>) {
    const data = credentialsSchema.parse(input);
    const user = await this.prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user || !(await verifyPassword(user.passwordHash, data.password))) {
      throw new AppError("Invalid email or password", "UNAUTHENTICATED", 401);
    }
    return this.issueTokens(user.id);
  }

  async logout(refreshToken: string | null | undefined) {
    if (!refreshToken) return true;
    await this.prisma.accessToken.updateMany({
      where: { tokenHash: tokenHash(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return true;
  }

  private async issueTokens(userId: number) {
    const accessToken = signAccessToken(userId);
    const placeholder = cryptoRandomToken();
    const accessRow = await this.prisma.accessToken.create({
      data: {
        userId,
        tokenHash: tokenHash(placeholder),
        expiresAt: refreshExpiresAt()
      }
    });
    const refreshToken = signRefreshToken(userId, accessRow.id);
    await this.prisma.accessToken.update({
      where: { id: accessRow.id },
      data: { tokenHash: tokenHash(refreshToken) }
    });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { user, accessToken, refreshToken };
  }
}

function cryptoRandomToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
