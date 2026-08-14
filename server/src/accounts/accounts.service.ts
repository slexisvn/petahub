import crypto from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type { Account } from "@prisma/client";
import { CONFIG, type HubConfig } from "../config/configuration";
import { PrismaService } from "../prisma/prisma.service";

export type GithubIdentity = {
  readonly githubId: string;
  readonly login: string;
  readonly name: string | null;
  readonly avatarUrl: string | null;
};

export type IssuedToken = {
  readonly id: string;
  readonly label: string;
  readonly secret: string;
};

const SECRET_BYTES = 32;
const HOUR = 60 * 60 * 1000;

export function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

function newSecret(): string {
  return crypto.randomBytes(SECRET_BYTES).toString("base64url");
}

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIG) private readonly config: HubConfig
  ) {}

  async upsertFromGithub(identity: GithubIdentity): Promise<Account> {
    return this.prisma.account.upsert({
      where: { githubId: identity.githubId },
      create: {
        githubId: identity.githubId,
        login: identity.login,
        name: identity.name,
        avatarUrl: identity.avatarUrl
      },
      update: {
        login: identity.login,
        name: identity.name,
        avatarUrl: identity.avatarUrl
      }
    });
  }

  async byLogin(login: string): Promise<Account | null> {
    return this.prisma.account.findUnique({ where: { login } });
  }

  async issueToken(accountId: string, label: string): Promise<IssuedToken> {
    const secret = newSecret();
    const record = await this.prisma.token.create({
      data: { accountId, label, hash: hashSecret(secret) }
    });
    return { id: record.id, label: record.label, secret };
  }

  async accountForToken(secret: string): Promise<Account | null> {
    const record = await this.prisma.token.findUnique({
      where: { hash: hashSecret(secret) },
      include: { account: true }
    });
    if (record === null || record.revokedAt !== null) return null;
    await this.prisma.token.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() }
    });
    return record.account;
  }

  async listTokens(accountId: string) {
    return this.prisma.token.findMany({
      where: { accountId, revokedAt: null },
      select: { id: true, label: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async revokeToken(accountId: string, id: string): Promise<boolean> {
    const result = await this.prisma.token.updateMany({
      where: { id, accountId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return result.count > 0;
  }

  async openSession(accountId: string): Promise<string> {
    const secret = newSecret();
    await this.prisma.session.create({
      data: {
        accountId,
        hash: hashSecret(secret),
        expiresAt: new Date(Date.now() + this.config.sessionHours * HOUR)
      }
    });
    return secret;
  }

  async accountForSession(secret: string): Promise<Account | null> {
    const session = await this.prisma.session.findUnique({ where: { hash: hashSecret(secret) } });
    if (session === null) return null;
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      return null;
    }
    return this.prisma.account.findUnique({ where: { id: session.accountId } });
  }

  async closeSession(secret: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { hash: hashSecret(secret) } });
  }
}
