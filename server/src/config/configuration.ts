import path from "node:path";

export type GithubConfig = {
  readonly clientId: string;
  readonly clientSecret: string;
};

export type ScopeClaims = "open" | "closed";

export type HubConfig = {
  readonly port: number;
  readonly publicUrl: string;
  readonly webUrl: string;
  readonly storageRoot: string;
  readonly registryName: string;
  readonly scopeClaims: ScopeClaims;
  readonly sessionHours: number;
  readonly github: GithubConfig | null;
};

export const CONFIG = Symbol("HubConfig");

const DEFAULT_PORT = 4400;
const DEFAULT_SESSION_HOURS = 24 * 14;

function text(env: NodeJS.ProcessEnv, key: string): string | null {
  const value = env[key];
  return value === undefined || value.length === 0 ? null : value;
}

function integer(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  minimum = 1,
): number {
  const value = text(env, key);
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`${key} expects an integer of at least ${minimum}, got '${value}'`);
  }
  return parsed;
}

function claims(env: NodeJS.ProcessEnv): ScopeClaims {
  const value = text(env, "HUB_SCOPE_CLAIMS") ?? "open";
  if (value !== "open" && value !== "closed") {
    throw new Error(`HUB_SCOPE_CLAIMS expects open|closed, got '${value}'`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): HubConfig {
  const port = integer(env, "PORT", DEFAULT_PORT, 0);
  const clientId = text(env, "GITHUB_CLIENT_ID");
  const clientSecret = text(env, "GITHUB_CLIENT_SECRET");
  return {
    port,
    publicUrl: text(env, "PUBLIC_URL") ?? `http://localhost:${port}`,
    webUrl: text(env, "WEB_URL") ?? "http://localhost:5173",
    storageRoot: path.resolve(text(env, "STORAGE_ROOT") ?? "storage"),
    registryName: text(env, "REGISTRY_NAME") ?? "petahub",
    scopeClaims: claims(env),
    sessionHours: integer(env, "SESSION_HOURS", DEFAULT_SESSION_HOURS),
    github:
      clientId === null || clientSecret === null ? null : { clientId, clientSecret }
  };
}
