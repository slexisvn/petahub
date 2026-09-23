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
const CLI_REDIRECT_COOKIE = "petahub_cli_redirect";
const CLI_STATE_COOKIE = "petahub_cli_state";
const STATE_MAX_AGE = 600;

type CookieOptions = {
  readonly sameSite?: "Lax" | "None";
  readonly secure?: boolean;
};

function originOf(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function sessionCookieOptions(config: HubConfig): CookieOptions {
  const publicUrl = originOf(config.publicUrl);
  const webUrl = originOf(config.webUrl);
  const crossOrigin = publicUrl !== null && webUrl !== null && publicUrl !== webUrl;
  const secure = config.publicUrl.startsWith("https://");
  return crossOrigin && secure ? { sameSite: "None", secure: true } : {};
}

function cookie(name: string, value: string, maxAge: number, options: CookieOptions = {}): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${options.sameSite ?? "Lax"}`,
    `Max-Age=${maxAge}`
  ];
  if (options.secure === true) parts.push("Secure");
  return parts.join("; ");
}

function loopbackRedirect(value: string | undefined): string | null {
  if (value === undefined || value.length === 0) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "http:") return null;
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]" && host !== "::1") {
    return null;
  }
  if (url.port.length === 0 || url.username.length > 0 || url.password.length > 0) return null;
  return url.toString();
}

function cliState(value: string | undefined): string | null {
  if (value === undefined || value.length < 8 || value.length > 128) return null;
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
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
  start(
    @Query("cli_redirect") cliRedirectValue: string | undefined,
    @Query("cli_state") cliStateValue: string | undefined,
    @Res() response: Response
  ): void {
    const state = crypto.randomBytes(16).toString("base64url");
    const cookies = [cookie(STATE_COOKIE, state, STATE_MAX_AGE)];
    if (cliRedirectValue !== undefined || cliStateValue !== undefined) {
      const redirect = loopbackRedirect(cliRedirectValue);
      const stateValue = cliState(cliStateValue);
      if (redirect === null || stateValue === null) {
        throw new BadRequestException("CLI sign-in needs a localhost redirect and state");
      }
      cookies.push(
        cookie(CLI_REDIRECT_COOKIE, redirect, STATE_MAX_AGE),
        cookie(CLI_STATE_COOKIE, stateValue, STATE_MAX_AGE)
      );
    }
    response.setHeader("Set-Cookie", cookies);
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
    const cookies = [
      cookie(STATE_COOKIE, "", 0),
      cookie(
        SESSION_COOKIE,
        session,
        this.config.sessionHours * 3600,
        sessionCookieOptions(this.config)
      )
    ];
    const cliRedirect = cookieFrom(request, CLI_REDIRECT_COOKIE);
    const cliStateValue = cookieFrom(request, CLI_STATE_COOKIE);
    if (cliRedirect !== null || cliStateValue !== null) {
      const redirect = loopbackRedirect(cliRedirect ?? undefined);
      const stateValue = cliState(cliStateValue ?? undefined);
      if (redirect === null || stateValue === null) {
        throw new BadRequestException("the CLI sign-in request did not match; start again");
      }
      const issued = await this.accounts.issueToken(account.id, "peta CLI");
      const target = new URL(redirect);
      target.searchParams.set("state", stateValue);
      target.searchParams.set("token", issued.secret);
      target.searchParams.set("login", account.login);
      cookies.push(
        cookie(CLI_REDIRECT_COOKIE, "", 0),
        cookie(CLI_STATE_COOKIE, "", 0)
      );
      response.setHeader("Set-Cookie", cookies);
      response.redirect(target.toString());
      return;
    }
    response.setHeader("Set-Cookie", cookies);
    response.redirect(this.config.webUrl);
  }

  @Post("logout")
  async logout(@Req() request: AuthenticatedRequest, @Res() response: Response): Promise<void> {
    const session = cookieFrom(request, SESSION_COOKIE);
    if (session !== null) await this.accounts.closeSession(session);
    response.setHeader("Set-Cookie", cookie(SESSION_COOKIE, "", 0, sessionCookieOptions(this.config)));
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
