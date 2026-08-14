export type SearchHit = {
  readonly name: string;
  readonly description: string | null;
  readonly latest: string | null;
  readonly downloads: number;
  readonly updatedAt: string;
};

export type Release = {
  readonly version: string;
  readonly integrity: string;
  readonly archive: string;
  readonly bytes: number;
  readonly files: number;
  readonly dependencies: Record<string, string>;
  readonly yanked: boolean;
  readonly downloads: number;
  readonly publishedAt: string;
  readonly publishedBy: string;
};

export type PackageDetail = {
  readonly name: string;
  readonly description: string | null;
  readonly repository: string | null;
  readonly readme: string | null;
  readonly owner: string;
  readonly scope: string;
  readonly createdAt: string;
  readonly releases: readonly Release[];
};

export type Dependent = {
  readonly name: string;
  readonly description: string | null;
  readonly version: string;
  readonly range: string;
};

export type Identity = {
  readonly login: string;
  readonly name: string | null;
  readonly avatarUrl: string | null;
  readonly scopes: readonly string[];
};

export type TokenSummary = {
  readonly id: string;
  readonly label: string;
  readonly createdAt: string;
  readonly lastUsedAt: string | null;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export const NOT_FOUND_STATUS = 404;

export function messageOf(issue: unknown): string {
  return issue instanceof Error ? issue.message : String(issue);
}

export function isNotFound(issue: unknown): boolean {
  return issue instanceof ApiError && issue.status === NOT_FOUND_STATUS;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: init.body === undefined ? {} : { "content-type": "application/json" },
    ...init
  });
  const text = await response.text();
  if (!response.ok) {
    let message = `request failed with ${response.status}`;
    try {
      const parsed = JSON.parse(text) as { message?: string | string[] };
      if (typeof parsed.message === "string") message = parsed.message;
      else if (Array.isArray(parsed.message)) message = parsed.message.join("; ");
    } catch {
      message = `request failed with ${response.status}`;
    }
    throw new ApiError(response.status, message);
  }
  return (text.length === 0 ? {} : JSON.parse(text)) as T;
}

export function searchPackages(query: string): Promise<{ packages: SearchHit[] }> {
  const suffix = query.length === 0 ? "" : `?q=${encodeURIComponent(query)}`;
  return call(`/api/v1/packages${suffix}`);
}

export function packageDetail(name: string): Promise<PackageDetail> {
  return call(`/api/v1/packages/${encodeURIComponent(name)}`);
}

export function packageDependents(name: string): Promise<{ dependents: Dependent[] }> {
  return call(`/api/v1/packages/${encodeURIComponent(name)}/dependents`);
}

export function whoami(): Promise<Identity> {
  return call("/api/v1/auth/whoami");
}

export function logout(): Promise<unknown> {
  return call("/api/v1/auth/logout", { method: "POST" });
}

export function listTokens(): Promise<{ tokens: TokenSummary[] }> {
  return call("/api/v1/auth/tokens");
}

export function createToken(label: string): Promise<{ id: string; label: string; token: string }> {
  return call("/api/v1/auth/tokens", { method: "POST", body: JSON.stringify({ label }) });
}

export function revokeToken(id: string): Promise<unknown> {
  return call(`/api/v1/auth/tokens/${id}`, { method: "DELETE" });
}

export function claimScope(name: string): Promise<{ name: string }> {
  return call("/api/v1/scopes", { method: "POST", body: JSON.stringify({ name }) });
}

export function archiveUrl(archive: string): string {
  return `/${archive}`;
}

export const SIGN_IN_URL = "/api/v1/auth/github";
export const SEARCH_LIMIT = 50;
