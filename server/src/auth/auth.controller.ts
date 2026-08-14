import crypto from "node:crypto";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Res,
  UseGuards
} from "@nestjs/common";
import type { Account } from "@prisma/client";
import type { Response } from "express";
import { AccountsService } from "../accounts/accounts.service";
import { ScopesService } from "../accounts/scopes.service";
import { CONFIG, type HubConfig } from "../config/configuration";
import {
  CurrentAccount,
  SESSION_COOKIE,
  SessionOrTokenGuard,
  cookieFrom,
  type AuthenticatedRequest
} from "./auth.guard";
import { GithubService } from "./github.service";
import { Req } from "@nestjs/common";

const STATE_COOKIE = "petahub_oauth_state";
const STATE_MAX_AGE = 600;

function cookie(name: string, value: string, maxAge: number): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`
  ];
  return parts.join("; ");
}

@Controller("api/v1/auth")
export class AuthController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly scopes: ScopesService,
    private readonly github: GithubService,
    @Inject(CONFIG) private readonly config: HubConfig
  ) {}

  @Get("github")
  start(@Res() response: Response): void {
    const state = crypto.randomBytes(16).toString("base64url");
    response.setHeader("Set-Cookie", cookie(STATE_COOKIE, state, STATE_MAX_AGE));
    response.redirect(this.github.authorizeUrl(state));
  }

  @Get("github/callback")
  async finish(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response
  ): Promise<void> {
    const expected = cookieFrom(request, STATE_COOKIE);
    if (code === undefined || state === undefined || expected === null || state !== expected) {
      throw new BadRequestException("the sign-in request did not match; start again");
    }
    const identity = await this.github.identityFor(code);
    const account = await this.accounts.upsertFromGithub(identity);
    const session = await this.accounts.openSession(account.id);
    response.setHeader("Set-Cookie", [
      cookie(STATE_COOKIE, "", 0),
      cookie(SESSION_COOKIE, session, this.config.sessionHours * 3600)
    ]);
    response.redirect(this.config.webUrl);
  }

  @Post("logout")
  async logout(@Req() request: AuthenticatedRequest, @Res() response: Response): Promise<void> {
    const session = cookieFrom(request, SESSION_COOKIE);
    if (session !== null) await this.accounts.closeSession(session);
    response.setHeader("Set-Cookie", cookie(SESSION_COOKIE, "", 0));
    response.status(204).send();
  }

  @Get("whoami")
  @UseGuards(SessionOrTokenGuard)
  async whoami(@CurrentAccount() account: Account) {
    const owned = await this.scopes.ownedBy(account.id);
    return {
      login: account.login,
      name: account.name,
      avatarUrl: account.avatarUrl,
      scopes: owned.map((scope) => scope.name)
    };
  }

  @Get("tokens")
  @UseGuards(SessionOrTokenGuard)
  async tokens(@CurrentAccount() account: Account) {
    return { tokens: await this.accounts.listTokens(account.id) };
  }

  @Post("tokens")
  @UseGuards(SessionOrTokenGuard)
  async createToken(@CurrentAccount() account: Account, @Body() body: { label?: unknown }) {
    const label = typeof body.label === "string" && body.label.length > 0 ? body.label : "cli";
    const issued = await this.accounts.issueToken(account.id, label);
    return { id: issued.id, label: issued.label, token: issued.secret };
  }

  @Delete("tokens/:id")
  @UseGuards(SessionOrTokenGuard)
  async revokeToken(@CurrentAccount() account: Account, @Param("id") id: string) {
    const revoked = await this.accounts.revokeToken(account.id, id);
    if (!revoked) throw new BadRequestException("no such token");
    return { revoked: true };
  }
}
