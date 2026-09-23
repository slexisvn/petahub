import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { packArchive, packTar, readManifestAt, integrityOf } from "@slexisvn/peta";

let root: string;
let app: INestApplication;
let server: unknown;

type PackageSpec = {
  readonly name: string;
  readonly version: string;
  readonly dependencies?: Record<string, unknown>;
  readonly files?: Record<string, string>;
};

function buildArchive(spec: PackageSpec): Buffer {
  const directory = path.join(root, "build", `${spec.name}-${spec.version}`);
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
  const manifest: Record<string, unknown> = {
    name: spec.name,
    version: spec.version,
    modules: "src"
  };
  if (spec.dependencies !== undefined) manifest["dependencies"] = spec.dependencies;
  fs.writeFileSync(
    path.join(directory, "tera.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );
  const files = spec.files ?? { "src/__init__.tera": "x = 1\n" };
  for (const [file, contents] of Object.entries(files)) {
    const target = path.join(directory, ...file.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents, "utf8");
  }
  return packArchive(directory, readManifestAt(directory));
}

function buildRawArchive(
  manifest: Record<string, unknown>,
  files: Record<string, string>
): Buffer {
  const entries = [
    { path: "tera.json", contents: Buffer.from(`${JSON.stringify(manifest)}\n`) },
    ...Object.entries(files).map(([file, contents]) => ({
      path: file,
      contents: Buffer.from(contents)
    }))
  ];
  return zlib.gzipSync(packTar(entries));
}

function admin(...args: string[]): string {
  return execFileSync(process.execPath, [path.join(__dirname, "..", "dist", "admin.js"), ...args], {
    encoding: "utf8",
    env: process.env
  }).trim();
}

let token: string;
let otherToken: string;

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "petahub-"));
  process.env["DATABASE_URL"] = `file:${path.join(root, "hub.db").split("\\").join("/")}`;
  process.env["STORAGE_ROOT"] = path.join(root, "storage");
  process.env["WEB_URL"] = "http://localhost:5173";
  process.env["GITHUB_CLIENT_ID"] = "test-client";
  process.env["GITHUB_CLIENT_SECRET"] = "test-secret";

  execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"], {
    cwd: path.join(__dirname, ".."),
    env: process.env,
    stdio: "pipe",
    shell: true
  });
  execFileSync("npx", ["nest", "build"], {
    cwd: path.join(__dirname, ".."),
    env: process.env,
    stdio: "pipe",
    shell: true
  });

  admin("account", "sinh");
  admin("account", "mallory");
  admin("scope", "sinh", "slexis");
  admin("scope", "mallory", "acme");
  token = admin("token", "sinh");
  otherToken = admin("token", "mallory");

  const { createServer } = await import("../src/main");
  const created = await createServer();
  app = created.app;
  await app.init();
  server = app.getHttpServer();
}, 180000);

afterAll(async () => {
  await app?.close();
  fs.rmSync(root, { recursive: true, force: true });
});

function api() {
  return request(server as Parameters<typeof request>[0]);
}

function publish(archive: Buffer, bearer = token) {
  return api()
    .post("/api/v1/publish")
    .set("Authorization", `Bearer ${bearer}`)
    .set("Content-Type", "application/octet-stream")
    .send(archive);
}

describe("publishing", () => {
  it("accepts a package from the scope's owner", async () => {
    const archive = buildArchive({ name: "slexis.json", version: "1.0.0" });
    const response = await publish(archive);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "slexis.json",
      version: "1.0.0",
      integrity: integrityOf(archive)
    });
  });

  it("writes an index file a plain client can read", async () => {
    await publish(buildArchive({ name: "slexis.json", version: "1.1.0" }));
    const response = await api().get("/index/slexis/json.json");
    expect(response.status).toBe(200);
    const index = JSON.parse(response.text) as {
      name: string;
      versions: { version: string; archive: string }[];
    };
    expect(index.name).toBe("slexis.json");
    expect(index.versions.map((entry) => entry.version)).toEqual(["1.0.0", "1.1.0"]);
  });

  it("serves the archive bytes it was given", async () => {
    const archive = buildArchive({ name: "slexis.http", version: "0.1.0" });
    await publish(archive);
    const response = await api().get("/pkg/slexis.http/0.1.0.tpkg").buffer(true);
    expect(response.status).toBe(200);
    expect(integrityOf(response.body as Buffer)).toBe(integrityOf(archive));
  });

  it("refuses a second publish of the same version", async () => {
    const archive = buildArchive({ name: "slexis.json", version: "1.0.0" });
    const response = await publish(archive);
    expect(response.status).toBe(409);
    expect(response.body.message).toContain("immutable");
  });

  it("refuses a scope the account does not own", async () => {
    const archive = buildArchive({ name: "slexis.other", version: "1.0.0" });
    const response = await publish(archive, otherToken);
    expect(response.status).toBe(403);
    expect(response.body.message).toContain("slexis");
  });

  it("refuses an unclaimed scope", async () => {
    const archive = buildArchive({ name: "nobody.thing", version: "1.0.0" });
    const response = await publish(archive);
    expect(response.status).toBe(404);
    expect(response.body.message).toContain("claim it");
  });

  it("refuses host code in an archive the client would never build", async () => {
    const archive = buildRawArchive(
      { name: "slexis.native", version: "1.0.0", modules: "src" },
      { "src/__init__.tera": "", "src/hook.js": "console.log(1)\n" }
    );
    const response = await publish(archive);
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("host code");
  });

  it("refuses an archive entry that escapes the package root", async () => {
    const archive = buildRawArchive(
      { name: "slexis.evil", version: "1.0.0", modules: "src" },
      { "../../outside.tera": "x = 1\n" }
    );
    const response = await publish(archive);
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("escapes the package root");
  });

  it("refuses an archive with no manifest", async () => {
    const archive = zlib.gzipSync(
      packTar([{ path: "src/__init__.tera", contents: Buffer.from("x = 1\n") }])
    );
    const response = await publish(archive);
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("tera.json");
  });

  it("refuses a path dependency", async () => {
    const archive = buildArchive({
      name: "slexis.linked",
      version: "1.0.0",
      dependencies: { "slexis.json": { path: "../json" } }
    });
    const response = await publish(archive);
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("path or git source");
  });

  it("refuses an unknown token", async () => {
    const response = await publish(buildArchive({ name: "slexis.x", version: "1.0.0" }), "nope");
    expect(response.status).toBe(401);
  });

  it("refuses a request with no token", async () => {
    const response = await api()
      .post("/api/v1/publish")
      .set("Content-Type", "application/octet-stream")
      .send(buildArchive({ name: "slexis.y", version: "1.0.0" }));
    expect(response.status).toBe(401);
  });
});

describe("yanking", () => {
  beforeEach(async () => {
    await publish(buildArchive({ name: "slexis.yankme", version: "1.0.0" }));
  });

  it("marks a version yanked in the index without deleting it", async () => {
    const yanked = await api()
      .post("/api/v1/packages/slexis.yankme/versions/1.0.0/yank")
      .set("Authorization", `Bearer ${token}`);
    expect(yanked.status).toBe(201);

    const index = JSON.parse((await api().get("/index/slexis/yankme.json")).text) as {
      versions: { version: string; yanked?: boolean }[];
    };
    expect(index.versions[0]).toMatchObject({ version: "1.0.0", yanked: true });
    expect((await api().get("/pkg/slexis.yankme/1.0.0.tpkg")).status).toBe(200);
  });

  it("can be undone", async () => {
    await api()
      .post("/api/v1/packages/slexis.yankme/versions/1.0.0/yank")
      .set("Authorization", `Bearer ${token}`);
    await api()
      .delete("/api/v1/packages/slexis.yankme/versions/1.0.0/yank")
      .set("Authorization", `Bearer ${token}`);
    const index = JSON.parse((await api().get("/index/slexis/yankme.json")).text) as {
      versions: { yanked?: boolean }[];
    };
    expect(index.versions[0]!.yanked).toBeUndefined();
  });

  it("refuses someone else's package", async () => {
    const response = await api()
      .post("/api/v1/packages/slexis.yankme/versions/1.0.0/yank")
      .set("Authorization", `Bearer ${otherToken}`);
    expect(response.status).toBe(403);
  });
});

describe("reading the registry", () => {
  it("searches by name", async () => {
    const response = await api().get("/api/v1/packages?q=http");
    expect(response.status).toBe(200);
    expect(response.body.packages.map((entry: { name: string }) => entry.name)).toContain(
      "slexis.http"
    );
  });

  it("returns package detail with releases and owner", async () => {
    const response = await api().get("/api/v1/packages/slexis.json");
    expect(response.status).toBe(200);
    expect(response.body.owner).toBe("sinh");
    expect(response.body.releases.map((entry: { version: string }) => entry.version)).toEqual([
      "1.1.0",
      "1.0.0"
    ]);
  });

  it("404s an unknown package", async () => {
    expect((await api().get("/api/v1/packages/nobody.here")).status).toBe(404);
  });

  it("counts downloads", async () => {
    await api().get("/pkg/slexis.http/0.1.0.tpkg");
    const response = await api().get("/api/v1/packages/slexis.http");
    expect(response.body.releases[0].downloads).toBeGreaterThan(0);
  });

  it("refuses to serve anything outside index and pkg", async () => {
    expect((await api().get("/index/../hub.db")).status).toBe(404);
  });

  it("lists a package whose latest release depends on this one", async () => {
    await publish(
      buildArchive({
        name: "slexis.consumer",
        version: "1.0.0",
        dependencies: { "slexis.json": "^1.0.0" }
      })
    );
    const response = await api().get("/api/v1/packages/slexis.json/dependents");
    expect(response.status).toBe(200);
    expect(response.body.dependents).toContainEqual(
      expect.objectContaining({ name: "slexis.consumer", version: "1.0.0", range: "^1.0.0" })
    );
  });

  it("drops a dependent whose latest release no longer requires it", async () => {
    await publish(
      buildArchive({
        name: "slexis.dropper",
        version: "1.0.0",
        dependencies: { "slexis.json": "^1.0.0" }
      })
    );
    await publish(buildArchive({ name: "slexis.dropper", version: "2.0.0" }));
    const response = await api().get("/api/v1/packages/slexis.json/dependents");
    expect(response.body.dependents.map((entry: { name: string }) => entry.name)).not.toContain(
      "slexis.dropper"
    );
  });

  it("404s dependents of an unknown package", async () => {
    expect((await api().get("/api/v1/packages/nobody.here/dependents")).status).toBe(404);
  });
});

describe("identity", () => {
  it("starts a CLI browser sign-in with a loopback redirect", async () => {
    const response = await api()
      .get("/api/v1/auth/github")
      .query({
        cli_redirect: "http://127.0.0.1:34567/peta-login",
        cli_state: "abc12345"
      })
      .redirects(0);
    expect(response.status).toBe(302);
    expect(String(response.headers.location)).toContain("github.com/login/oauth/authorize");
    const cookies = (response.headers["set-cookie"] as unknown as string[]).join("\n");
    expect(decodeURIComponent(cookies)).toContain(
      "petahub_cli_redirect=http://127.0.0.1:34567/peta-login"
    );
    expect(cookies).toContain("petahub_cli_state=abc12345");
  });

  it("refuses CLI sign-in redirects away from localhost", async () => {
    const response = await api()
      .get("/api/v1/auth/github")
      .query({
        cli_redirect: "https://example.com/callback",
        cli_state: "abc12345"
      });
    expect(response.status).toBe(400);
  });

  it("reports the account behind a token", async () => {
    const response = await api()
      .get("/api/v1/auth/whoami")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ login: "sinh", scopes: ["slexis"] });
  });

  it("issues and revokes tokens", async () => {
    const created = await api()
      .post("/api/v1/auth/tokens")
      .set("Authorization", `Bearer ${token}`)
      .send({ label: "ci" });
    expect(created.status).toBe(201);
    expect(typeof created.body.token).toBe("string");

    const used = await api()
      .get("/api/v1/auth/whoami")
      .set("Authorization", `Bearer ${created.body.token}`);
    expect(used.status).toBe(200);

    await api()
      .delete(`/api/v1/auth/tokens/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);
    const revoked = await api()
      .get("/api/v1/auth/whoami")
      .set("Authorization", `Bearer ${created.body.token}`);
    expect(revoked.status).toBe(401);
  });

  it("lets an account claim a free scope", async () => {
    const response = await api()
      .post("/api/v1/scopes")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "brandnew" });
    expect(response.status).toBe(201);
    expect(response.body.name).toBe("brandnew");
  });

  it("refuses a scope somebody else holds", async () => {
    const response = await api()
      .post("/api/v1/scopes")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ name: "slexis" });
    expect(response.status).toBe(403);
  });

  it("refuses a dotted name as a scope", async () => {
    const response = await api()
      .post("/api/v1/scopes")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "a.b" });
    expect(response.status).toBe(403);
  });
});
