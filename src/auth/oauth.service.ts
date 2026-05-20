import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "./password.js";

export class OAuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async createApplication(ownerUserId: number, name: string, redirectUris: string[]) {
    const clientId = crypto.randomBytes(18).toString("hex");
    const secret = crypto.randomBytes(32).toString("hex");
    const app = await this.prisma.oAuthApplication.create({
      data: {
        ownerUserId,
        name,
        clientId,
        clientSecretHash: await hashPassword(secret),
        redirectUris
      }
    });
    return { application: app, clientSecret: secret };
  }
}
