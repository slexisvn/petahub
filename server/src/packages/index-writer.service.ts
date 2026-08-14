import { Injectable } from "@nestjs/common";
import {
  compareVersion,
  parsePackageName,
  parseRange,
  parseVersion,
  type IndexEntry
} from "@slexisvn/peta";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class IndexWriter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  async rebuild(packageName: string): Promise<string> {
    const record = await this.prisma.package.findUnique({
      where: { name: packageName },
      include: { releases: true }
    });
    if (record === null) throw new Error(`no package named '${packageName}'`);
    const entries: IndexEntry[] = record.releases
      .map((release) => ({
        version: parseVersion(release.version),
        dependencies: Object.entries(
          JSON.parse(release.dependencies) as Record<string, string>
        ).map(([name, range]) => ({
          name: parsePackageName(name),
          range: parseRange(range)
        })),
        integrity: release.integrity,
        archive: release.archivePath,
        yanked: release.yanked
      }))
      .sort((left, right) => compareVersion(left.version, right.version));
    return this.storage.writeIndex(parsePackageName(packageName), entries);
  }
}
