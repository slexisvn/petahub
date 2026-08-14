import { describe, expect, it } from "vitest";
import type { Release } from "../../src/api";
import { byVersionDescending, latestRelease, totalDownloads } from "../../src/lib/releases";

function release(version: string, options: Partial<Release> = {}): Release {
  return {
    version,
    integrity: "sha256-0",
    archive: `pkg/x.y/${version}.tpkg`,
    bytes: 1024,
    files: 2,
    dependencies: {},
    yanked: false,
    downloads: 0,
    publishedAt: "2026-01-01T00:00:00.000Z",
    publishedBy: "sinh",
    ...options
  };
}

describe("byVersionDescending", () => {
  it("orders by semver precedence rather than publication order", () => {
    const ordered = byVersionDescending([
      release("1.9.0", { publishedAt: "2026-01-01T00:00:00.000Z" }),
      release("1.10.0", { publishedAt: "2026-02-01T00:00:00.000Z" }),
      release("1.2.0", { publishedAt: "2026-03-01T00:00:00.000Z" })
    ]);
    expect(ordered.map((entry) => entry.version)).toEqual(["1.10.0", "1.9.0", "1.2.0"]);
  });

  it("sorts a prerelease below the release it precedes", () => {
    const ordered = byVersionDescending([release("2.0.0-rc.1"), release("2.0.0")]);
    expect(ordered.map((entry) => entry.version)).toEqual(["2.0.0", "2.0.0-rc.1"]);
  });
});

describe("latestRelease", () => {
  it("skips a yanked version even when it is the highest", () => {
    const latest = latestRelease([release("2.0.0", { yanked: true }), release("1.4.0")]);
    expect(latest?.version).toBe("1.4.0");
  });

  it("prefers a stable version over a higher prerelease", () => {
    const latest = latestRelease([release("2.0.0-rc.1"), release("1.9.0")]);
    expect(latest?.version).toBe("1.9.0");
  });

  it("falls back to a prerelease when nothing stable is published", () => {
    const latest = latestRelease([release("0.1.0-alpha.1")]);
    expect(latest?.version).toBe("0.1.0-alpha.1");
  });

  it("returns null when every version is yanked", () => {
    const latest = latestRelease([
      release("1.0.0", { yanked: true }),
      release("1.1.0", { yanked: true })
    ]);
    expect(latest).toBeNull();
  });
});

describe("totalDownloads", () => {
  it("counts yanked releases too, because they were still installed", () => {
    const total = totalDownloads([
      release("1.0.0", { downloads: 3, yanked: true }),
      release("1.1.0", { downloads: 4 })
    ]);
    expect(total).toBe(7);
  });
});
