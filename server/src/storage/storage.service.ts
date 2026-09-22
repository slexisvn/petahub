import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Inject, Injectable } from "@nestjs/common";
import {
  archivePathFor,
  formatPackageIndex,
  indexPathFor,
  type IndexEntry,
  type PackageName,
  type Version
} from "@slexisvn/peta";
import { CONFIG, type HubConfig } from "../config/configuration";

export class StoragePathError extends Error {}

const SERVABLE_PREFIXES = ["index", "pkg"] as const;

@Injectable()
export class StorageService {
  constructor(@Inject(CONFIG) private readonly config: HubConfig) {}

  get root(): string {
    return this.config.storageRoot;
  }

  archiveLocation(name: PackageName, version: Version): string {
    return archivePathFor(name, version);
  }

  private absolute(relative: string): string {
    const segments = relative.split("/").filter((segment) => segment.length > 0);
    if (segments.some((segment) => segment === "." || segment === "..")) {
      throw new StoragePathError(`'${relative}' escapes the storage root`);
    }
    const target = path.resolve(this.root, ...segments);
    const bounded = path.resolve(this.root) + path.sep;
    if (!target.startsWith(bounded)) {
      throw new StoragePathError(`'${relative}' escapes the storage root`);
    }
    return target;
  }

  isServable(relative: string): boolean {
    const first = relative.split("/")[0];
    return SERVABLE_PREFIXES.some((prefix) => prefix === first);
  }

  write(relative: string, contents: Buffer): void {
    const target = this.absolute(relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const staging = `${target}.${crypto.randomBytes(6).toString("hex")}.tmp`;
    fs.writeFileSync(staging, contents);
    fs.renameSync(staging, target);
  }

  read(relative: string): Buffer | null {
    let target: string;
    try {
      target = this.absolute(relative);
    } catch {
      return null;
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return null;
    return fs.readFileSync(target);
  }

  writeIndex(name: PackageName, entries: readonly IndexEntry[]): string {
    const location = indexPathFor(name);
    this.write(location, Buffer.from(formatPackageIndex({ name, entries }), "utf8"));
    return location;
  }
}
