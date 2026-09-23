import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import type { Account } from "@prisma/client";
import { PetaError, formatVersion, parseVersion } from "@slexisvn/peta";
import type { Request } from "express";
import { ScopesService } from "../accounts/scopes.service";
import {
  CurrentAccount,
  SessionOrTokenGuard,
  TokenGuard
} from "../auth/auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { PublishService } from "./publish.service";

const SEARCH_LIMIT = 50;
const DEPENDENTS_LIMIT = 100;

@Controller("api/v1")
export class PackagesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: PublishService,
    private readonly scopes: ScopesService
  ) {}

  @Post("publish")
  @UseGuards(TokenGuard)
  async publish(@CurrentAccount() account: Account, @Req() request: Request) {
    const body = request.body;
    if (!Buffer.isBuffer(body)) {
      throw new BadRequestException(
        "send the .tpkg bytes with Content-Type: application/octet-stream"
      );
    }
    return this.publisher.publish(account, body);
  }

  @Post("packages/:name/versions/:version/yank")
  @UseGuards(TokenGuard)
  async yank(
    @CurrentAccount() account: Account,
    @Param("name") name: string,
    @Param("version") version: string
  ) {
    await this.publisher.setYanked(account, name, this.normalize(version), true);
    return { name, version, yanked: true };
  }

  @Delete("packages/:name/versions/:version/yank")
  @UseGuards(TokenGuard)
  async unyank(
    @CurrentAccount() account: Account,
    @Param("name") name: string,
    @Param("version") version: string
  ) {
    await this.publisher.setYanked(account, name, this.normalize(version), false);
    return { name, version, yanked: false };
  }

  @Get("packages")
  async search(@Query("q") query: string | undefined) {
    const where =
      query === undefined || query.length === 0
        ? { releases: { some: { yanked: false } } }
        : {
            releases: { some: { yanked: false } },
            OR: [
              { name: { contains: query } },
              { description: { contains: query } }
            ]
          };
    const packages = await this.prisma.package.findMany({
      where,
      take: SEARCH_LIMIT,
      orderBy: { name: "asc" },
      include: { releases: { where: { yanked: false }, orderBy: { publishedAt: "desc" } } }
    });
    return {
      limit: SEARCH_LIMIT,
      packages: packages.map((entry) => ({
        name: entry.name,
        description: entry.description,
        latest: entry.releases[0]?.version ?? null,
        downloads: entry.releases.reduce((total, release) => total + release.downloads, 0),
        updatedAt: entry.updatedAt
      }))
    };
  }

  @Get("packages/:name")
  async detail(@Param("name") name: string) {
    const entry = await this.prisma.package.findUnique({
      where: { name },
      include: {
        releases: { orderBy: { publishedAt: "desc" }, include: { publishedBy: true } },
        scope: { include: { owner: true } }
      }
    });
    if (entry === null) throw new NotFoundException(`no package named '${name}'`);
    return {
      name: entry.name,
      description: entry.description,
      repository: entry.repository,
      readme: entry.readme,
      owner: entry.scope.owner.login,
      scope: entry.scopeName,
      createdAt: entry.createdAt,
      releases: entry.releases.map((release) => ({
        version: release.version,
        integrity: release.integrity,
        archive: release.archivePath,
        bytes: release.bytes,
        files: release.fileCount,
        dependencies: this.dependenciesOf(release),
        yanked: release.yanked,
        downloads: release.downloads,
        publishedAt: release.publishedAt,
        publishedBy: release.publishedBy.login
      }))
    };
  }

  @Get("packages/:name/dependents")
  async dependents(@Param("name") name: string) {
    const known = await this.prisma.package.findUnique({ where: { name }, select: { id: true } });
    if (known === null) throw new NotFoundException(`no package named '${name}'`);
    const candidates = await this.prisma.package.findMany({
      where: {
        releases: { some: { yanked: false, dependencies: { contains: JSON.stringify(name) } } }
      },
      take: DEPENDENTS_LIMIT,
      orderBy: { name: "asc" },
      include: {
        releases: { where: { yanked: false }, orderBy: { publishedAt: "desc" }, take: 1 }
      }
    });
    const dependents = candidates.flatMap((entry) => {
      const latest = entry.releases[0];
      if (latest === undefined) return [];
      const range = this.dependenciesOf(latest)[name];
      if (range === undefined) return [];
      return [{ name: entry.name, description: entry.description, version: latest.version, range }];
    });
    return { dependents };
  }

  @Get("scopes")
  @UseGuards(SessionOrTokenGuard)
  async myScopes(@CurrentAccount() account: Account) {
    const owned = await this.scopes.ownedBy(account.id);
    return { scopes: owned.map((scope) => ({ name: scope.name, claimedAt: scope.createdAt })) };
  }

  @Post("scopes")
  @UseGuards(SessionOrTokenGuard)
  async claimScope(@CurrentAccount() account: Account, @Body() body: { name?: unknown }) {
    if (typeof body.name !== "string") throw new BadRequestException("expected a scope name");
    try {
      const scope = await this.scopes.claim(account.id, body.name);
      return { name: scope.name, claimedAt: scope.createdAt };
    } catch (error) {
      if (error instanceof PetaError) throw new BadRequestException(error.message);
      throw error;
    }
  }

  private dependenciesOf(release: { dependencies: string }): Record<string, string> {
    return JSON.parse(release.dependencies) as Record<string, string>;
  }

  private normalize(version: string): string {
    try {
      return formatVersion(parseVersion(version));
    } catch {
      throw new BadRequestException(`'${version}' is not a version`);
    }
  }
}
