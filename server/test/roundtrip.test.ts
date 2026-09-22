import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

let root: string;
let hub: ChildProcess;
let hubUrl: string;
let token: string;

const PETA_CLI = path.join(
  __dirname,
  "..",
  "..",
  "node_modules",
  "@slexisvn",
  "peta",
  "dist",
  "cli.js"
);

type Outcome = { status: number; stdout: string; stderr: string };

function peta(cwd: string, ...args: string[]): Outcome {
  try {
    const stdout = execFileSync(process.execPath, [PETA_CLI, ...args], {
      cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        TERA_HOME: path.join(root, "home"),
        PETA_REGISTRY: hubUrl
      },
      stdio: ["pipe", "pipe", "pipe"]
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: failure.status ?? 1,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? ""
    };
  }
}

function admin(...args: string[]): string {
  return execFileSync(process.execPath, [path.join(__dirname, "..", "dist", "admin.js"), ...args], {
    encoding: "utf8",
    env: process.env
  }).trim();
}

function writePackage(directory: string, manifest: Record<string, unknown>, files: Record<string, string>): string {
  const target = path.join(root, directory);
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, "tera.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  for (const [file, contents] of Object.entries(files)) {
    const destination = path.join(target, ...file.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, contents, "utf8");
  }
  return target;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const port = (probe.address() as net.AddressInfo).port;
      probe.close(() => resolve(port));
    });
  });
}

async function waitForHub(url: string, attempts = 100): Promise<void> {
  for (let at = 0; at < attempts; at++) {
    try {
      const response = await fetch(`${url}/api/v1/packages`);
      if (response.ok) return;
    } catch {
      /* the server is not listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`the hub never came up at ${url}`);
}

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "petahub-rt-"));
  process.env["DATABASE_URL"] = `file:${path.join(root, "hub.db").split("\\").join("/")}`;
  process.env["STORAGE_ROOT"] = path.join(root, "storage");

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
  admin("scope", "sinh", "slexis");
  token = admin("token", "sinh");

  const port = await freePort();
  hubUrl = `http://127.0.0.1:${port}`;
  hub = spawn(process.execPath, [path.join(__dirname, "..", "dist", "main.js")], {
    env: { ...process.env, PORT: String(port), PUBLIC_URL: hubUrl },
    stdio: "ignore"
  });
  await waitForHub(hubUrl);
}, 180000);

afterAll(() => {
  hub?.kill();
  fs.rmSync(root, { recursive: true, force: true });
});

describe("a package's whole life", () => {
  it("logs in with the issued token", () => {
    fs.mkdirSync(path.join(root, "empty"), { recursive: true });
    const result = peta(path.join(root, "empty"), "login", "--token", token);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("signed in");
    expect(result.stdout).toContain("as sinh");
  });

  it("reports who the token belongs to", () => {
    const result = peta(path.join(root, "empty"), "whoami");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("sinh");
    expect(result.stdout).toContain("slexis");
  });

  it("publishes a package", () => {
    const directory = writePackage(
      "lib",
      { name: "slexis.json", version: "1.0.0", modules: "src" },
      { "src/__init__.tera": "fn parse(text):\n  return text\n" }
    );
    const result = peta(directory, "publish");
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("published slexis.json 1.0.0");
  });

  it("refuses to publish the same version twice", () => {
    const result = peta(path.join(root, "lib"), "publish");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("immutable");
  });

  it("finds the package through search", () => {
    const result = peta(path.join(root, "empty"), "search", "slexis");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("slexis.json");
  });

  it("installs it into a fresh project over http", () => {
    const application = writePackage(
      "app",
      { modules: "src", dependencies: { "slexis.json": "^1.0.0" } },
      { "src/main.tera": "import slexis.json\n" }
    );
    const result = peta(application, "install");
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);

    const installed = path.join(application, "tera_packages", "slexis", "json", "__init__.tera");
    expect(fs.existsSync(installed)).toBe(true);
    expect(fs.readFileSync(installed, "utf8")).toContain("fn parse");

    const lock = JSON.parse(fs.readFileSync(path.join(application, "tera.lock"), "utf8")) as {
      packages: Record<string, { version: string; integrity: string }>;
    };
    expect(lock.packages["slexis.json"]!.version).toBe("1.0.0");
    expect(lock.packages["slexis.json"]!.integrity.startsWith("sha256-")).toBe(true);
  });

  it("passes its own dependency audit", () => {
    const result = peta(path.join(root, "app"), "check");
    expect(result.status).toBe(0);
  });

  it("stops resolving a yanked version without breaking the existing lock", () => {
    expect(peta(path.join(root, "empty"), "yank", "slexis.json@1.0.0").status).toBe(0);

    const reinstall = peta(path.join(root, "app"), "install");
    expect(reinstall.status).toBe(0);

    const fresh = writePackage(
      "app2",
      { modules: "src", dependencies: { "slexis.json": "^1.0.0" } },
      { "src/main.tera": "import slexis.json\n" }
    );
    const blocked = peta(fresh, "install");
    expect(blocked.status).toBe(1);
    expect(blocked.stderr).toContain("no versions of slexis.json");
  });

  it("can un-yank", () => {
    expect(peta(path.join(root, "empty"), "yank", "slexis.json@1.0.0", "--undo").status).toBe(0);
    const fresh = writePackage(
      "app3",
      { modules: "src", dependencies: { "slexis.json": "^1.0.0" } },
      { "src/main.tera": "import slexis.json\n" }
    );
    expect(peta(fresh, "install").status).toBe(0);
  });

  it("refuses to publish into a scope the account does not own", () => {
    const directory = writePackage(
      "other",
      { name: "acme.thing", version: "1.0.0", modules: "src" },
      { "src/__init__.tera": "" }
    );
    const result = peta(directory, "publish");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("acme");
  });

  it("forgets the token on logout", () => {
    expect(peta(path.join(root, "empty"), "logout").status).toBe(0);
    const result = peta(path.join(root, "empty"), "whoami");
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("peta login");
  });
});
