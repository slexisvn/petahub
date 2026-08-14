import { compareVersion, isPrerelease, tryParseVersion } from "@slexisvn/peta/browser";
import type { Release } from "../api";

export function compareReleases(left: Release, right: Release): number {
  const a = tryParseVersion(left.version);
  const b = tryParseVersion(right.version);
  if (a === null || b === null) return left.version.localeCompare(right.version);
  return compareVersion(b, a);
}

export function byVersionDescending(releases: readonly Release[]): readonly Release[] {
  return [...releases].sort(compareReleases);
}

export function latestRelease(releases: readonly Release[]): Release | null {
  const live = byVersionDescending(releases).filter((release) => !release.yanked);
  const stable = live.find((release) => !isPrereleaseVersion(release.version));
  return stable ?? live[0] ?? null;
}

export function isPrereleaseVersion(version: string): boolean {
  const parsed = tryParseVersion(version);
  return parsed !== null && isPrerelease(parsed);
}

export function totalDownloads(releases: readonly Release[]): number {
  return releases.reduce((sum, release) => sum + release.downloads, 0);
}

export function caretRange(version: string): string {
  return `^${version}`;
}
