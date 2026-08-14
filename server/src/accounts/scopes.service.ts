import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Scope } from "@prisma/client";
import { parsePackageName, scopeOf } from "@slexisvn/peta";
import { CONFIG, type HubConfig } from "../config/configuration";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ScopesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIG) private readonly config: HubConfig
  ) {}

  scopeNameFor(packageName: string): string {
    return scopeOf(parsePackageName(packageName));
  }

  async byName(name: string): Promise<Scope | null> {
    return this.prisma.scope.findUnique({ where: { name } });
  }

  async ownedBy(accountId: string): Promise<readonly Scope[]> {
    return this.prisma.scope.findMany({ where: { ownerId: accountId }, orderBy: { name: "asc" } });
  }

  async claim(accountId: string, name: string): Promise<Scope> {
    const scope = parsePackageName(name);
    if (scope.segments.length !== 1) {
      throw new ForbiddenException(`'${name}' is not a scope; a scope is a single segment`);
    }
    if (this.config.scopeClaims === "closed") {
      throw new ForbiddenException(
        "this registry does not accept self-service scope claims; ask an administrator"
      );
    }
    const existing = await this.byName(name);
    if (existing !== null) {
      throw new ForbiddenException(
        existing.ownerId === accountId
          ? `you already own '${name}'`
          : `'${name}' is already claimed`
      );
    }
    return this.prisma.scope.create({ data: { name, ownerId: accountId } });
  }

  async grant(accountId: string, name: string): Promise<Scope> {
    const existing = await this.byName(name);
    if (existing === null) {
      return this.prisma.scope.create({ data: { name, ownerId: accountId } });
    }
    return this.prisma.scope.update({ where: { name }, data: { ownerId: accountId } });
  }

  async requireOwnership(accountId: string, packageName: string): Promise<Scope> {
    const name = this.scopeNameFor(packageName);
    const scope = await this.byName(name);
    if (scope === null) {
      throw new NotFoundException(
        `nobody owns the scope '${name}'; claim it before publishing '${packageName}'`
      );
    }
    if (scope.ownerId !== accountId) {
      throw new ForbiddenException(`you do not own the scope '${name}'`);
    }
    return scope;
  }
}
