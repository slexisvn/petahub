import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator
} from "@nestjs/common";
import type { Account } from "@prisma/client";
import type { Request } from "express";
import { AccountsService } from "../accounts/accounts.service";

export const SESSION_COOKIE = "petahub_session";

export type AuthenticatedRequest = Request & { account?: Account };

function bearerFrom(request: Request): string | null {
  const header = request.headers.authorization;
  if (typeof header !== "string") return null;
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || value === undefined || value.length === 0) return null;
  return value;
}

export function cookieFrom(request: Request, name: string): string | null {
  const header = request.headers.cookie;
  if (typeof header !== "string") return null;
  for (const part of header.split(";")) {
    const at = part.indexOf("=");
    if (at < 0) continue;
    if (part.slice(0, at).trim() !== name) continue;
    return decodeURIComponent(part.slice(at + 1).trim());
  }
  return null;
}

@Injectable()
export class TokenGuard implements CanActivate {
  constructor(private readonly accounts: AccountsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const secret = bearerFrom(request);
    if (secret === null) {
      throw new UnauthorizedException("this endpoint needs a bearer token (run 'peta login')");
    }
    const account = await this.accounts.accountForToken(secret);
    if (account === null) throw new UnauthorizedException("unknown or revoked token");
    request.account = account;
    return true;
  }
}

@Injectable()
export class SessionOrTokenGuard implements CanActivate {
  constructor(private readonly accounts: AccountsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = cookieFrom(request, SESSION_COOKIE);
    const account =
      session === null
        ? null
        : await this.accounts.accountForSession(session);
    if (account !== null) {
      request.account = account;
      return true;
    }
    const secret = bearerFrom(request);
    const byToken = secret === null ? null : await this.accounts.accountForToken(secret);
    if (byToken === null) throw new UnauthorizedException("sign in first");
    request.account = byToken;
    return true;
  }
}

export const CurrentAccount = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Account => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.account === undefined) throw new UnauthorizedException("not authenticated");
    return request.account;
  }
);
