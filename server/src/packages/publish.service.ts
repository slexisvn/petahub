import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException
} from "@nestjs/common";
import type { Account } from "@prisma/client";
import {
  MAX_ARCHIVE_BYTES,
  PetaError,
  allDependencies,
  formatRange,
  formatVersion,
  integrityOf,
  isPinned,
  readArchive,
  type Manifest
} from "@slexisvn/peta";
import { ScopesService } from "../accounts/scopes.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { IndexWriter } from "./index-writer.service";

export type PublishResult = {
  readonly name: string;
  readonly version: string;
  readonly integrity: string;
  readonly bytes: number;
  readonly files: number;
};

const README = "README.md";

function requirementsOf(manifest: Manifest): Record<string, string> {
  const requirements: Record<string, string> = {};
  for (const dependency of allDependencies(manifest, false)) {
    if (dependency.source.kind !== "registry") continue;
    requirements[dependency.name.text] = formatRange(dependency.source.range);
  }
  return requirements;
}

@Injectable()
export class PublishService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopes: ScopesService,
    private readonly storage: StorageService,
    private readonly index: IndexWriter
  ) {}

  async publish(account: Account, archive: Buffer): Promise<PublishResult> {
    if (archive.length === 0) throw new BadRequestException("the request body was empty");
    if (archive.length > MAX_ARCHIVE_BYTES) {
      throw new PayloadTooLargeException(`an archive may not exceed ${MAX_ARCHIVE_BYTES} bytes`);
    }

    const contents = this.read(archive);
    const manifest = contents.manifest;
    if (manifest.name === null || manifest.version === null) {
      throw new BadRequestException("the archive's tera.json declares no name and version");
    }
    const name = manifest.name.text;
    const version = formatVersion(manifest.version);

    const pinned = allDependencies(manifest, false).filter((dependency) =>
      isPinned(dependency.source)
    );
    if (pinned.length > 0) {
      const names = pinned.map((dependency) => dependency.name.text).join(", ");
      throw new BadRequestException(
        `a published package cannot depend on a path or git source (${names})`
      );
    }

    const scope = await this.scopes.requireOwnership(account.id, name);

    const existing = await this.prisma.release.findFirst({
      where: { version, package: { name } }
    });
    if (existing !== null) {
      throw new ConflictException(
        `${name} ${version} is already published; published versions are immutable`
      );
    }

    const integrity = integrityOf(archive);
    const location = this.storage.archiveLocation(manifest.name, manifest.version);
    this.storage.write(location, archive);

    const readme = contents.entries.find((entry) => entry.path === README);
    const record = await this.prisma.package.upsert({
      where: { name },
      create: {
        name,
        scopeName: scope.name,
        description: manifest.description,
        repository: manifest.repository,
        readme: readme?.contents.toString("utf8") ?? null
      },
      update: {
        description: manifest.description,
        repository: manifest.repository,
        readme: readme?.contents.toString("utf8") ?? null
      }
    });

    await this.prisma.release.create({
      data: {
        packageId: record.id,
        version,
        integrity,
        archivePath: location,
        bytes: archive.length,
        fileCount: contents.entries.length,
        dependencies: JSON.stringify(requirementsOf(manifest)),
        publishedById: account.id
      }
    });

    await this.index.rebuild(name);
    return {
      name,
      version,
      integrity,
      bytes: archive.length,
      files: contents.entries.length
    };
  }

  async setYanked(
    account: Account,
    name: string,
    version: string,
    yanked: boolean
  ): Promise<void> {
    await this.scopes.requireOwnership(account.id, name);
    const release = await this.prisma.release.findFirst({
      where: { version, package: { name } }
    });
    if (release === null) throw new NotFoundException(`${name} ${version} is not published here`);
    if (release.yanked === yanked) return;
    await this.prisma.release.update({ where: { id: release.id }, data: { yanked } });
    await this.index.rebuild(name);
  }

  private read(archive: Buffer) {
    try {
      return readArchive(archive);
    } catch (error) {
      if (error instanceof PetaError) throw new BadRequestException(error.message);
      throw new BadRequestException("the archive could not be read");
    }
  }
}
