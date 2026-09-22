import { describe, expect, it } from "vitest";
import {
  mapIdentity,
  mapPackageDetail,
  mapSearchResult,
  mapTokenList
} from "../../src/api/mappers";

describe("api mappers", () => {
  it("maps package search dto into stable UI models", () => {
    const result = mapSearchResult({
      limit: 50,
      packages: [
        {
          name: "tera.http",
          description: "http helpers",
          latest: "1.0.0",
          downloads: 12,
          updatedAt: "2026-09-22T00:00:00.000Z"
        }
      ]
    });

    expect(result.limit).toBe(50);
    expect(result.packages).toEqual([
      {
        name: "tera.http",
        description: "http helpers",
        latest: "1.0.0",
        downloads: 12,
        updatedAt: "2026-09-22T00:00:00.000Z"
      }
    ]);
  });

  it("normalizes package detail nested collections", () => {
    const detail = mapPackageDetail({
      name: "tera.web",
      description: null,
      repository: null,
      readme: null,
      owner: "lexi",
      scope: "tera",
      createdAt: "2026-09-21T00:00:00.000Z",
      releases: [
        {
          version: "1.0.0",
          integrity: "sha256-0",
          archive: "pkg/tera.web/1.0.0.tpkg",
          bytes: 1024,
          files: 3,
          dependencies: { "zeta.core": "^1.0.0", "alpha.core": "^1.0.0" },
          yanked: false,
          downloads: 7,
          publishedAt: "2026-09-22T00:00:00.000Z",
          publishedBy: "lexi"
        }
      ]
    });

    expect(Object.keys(detail.releases[0]?.dependencies ?? {})).toEqual([
      "alpha.core",
      "zeta.core"
    ]);
  });

  it("sorts identity scopes before exposing them to the UI", () => {
    const identity = mapIdentity({
      login: "lexi",
      name: null,
      avatarUrl: null,
      scopes: ["zeta", "alpha"]
    });

    expect(identity.scopes).toEqual(["alpha", "zeta"]);
  });

  it("maps token lists without leaking transport objects", () => {
    const list = mapTokenList({
      tokens: [
        {
          id: "tok_1",
          label: "ci",
          createdAt: "2026-09-22T00:00:00.000Z",
          lastUsedAt: null
        }
      ]
    });

    expect(list.tokens[0]).toEqual({
      id: "tok_1",
      label: "ci",
      createdAt: "2026-09-22T00:00:00.000Z",
      lastUsedAt: null
    });
  });
});
