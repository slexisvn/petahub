import { endpoints } from "./api/endpoints";
import type {
  ClaimedScopeDto,
  CreatedTokenDto,
  DependentsResultDto,
  IdentityDto,
  PackageDetailDto,
  SearchResultDto,
  TokenListDto
} from "./api/dto";
import {
  mapClaimedScope,
  mapCreatedToken,
  mapDependentsResult,
  mapIdentity,
  mapPackageDetail,
  mapSearchResult,
  mapTokenList
} from "./api/mappers";
import type {
  ClaimedScope,
  CreatedToken,
  DependentsResult,
  Identity,
  PackageDetail,
  SearchResult,
  TokenList
} from "./models";

export type {
  ClaimedScope,
  CreatedToken,
  Dependent,
  DependentsResult,
  Identity,
  PackageDetail,
  Release,
  SearchHit,
  SearchResult,
  TokenList,
  TokenSummary
} from "./models";

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

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
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

export async function searchPackages(query: string): Promise<SearchResult> {
  return mapSearchResult(await call<SearchResultDto>(endpoints.packages(query)));
}

export async function packageDetail(name: string): Promise<PackageDetail> {
  return mapPackageDetail(await call<PackageDetailDto>(endpoints.packageDetail(name)));
}

export async function packageDependents(name: string): Promise<DependentsResult> {
  return mapDependentsResult(await call<DependentsResultDto>(endpoints.packageDependents(name)));
}

export async function whoami(): Promise<Identity> {
  return mapIdentity(await call<IdentityDto>(endpoints.whoami()));
}

export function logout(): Promise<unknown> {
  return call(endpoints.logout(), { method: "POST" });
}

export async function listTokens(): Promise<TokenList> {
  return mapTokenList(await call<TokenListDto>(endpoints.tokens()));
}

export async function createToken(label: string): Promise<CreatedToken> {
  return mapCreatedToken(
    await call<CreatedTokenDto>(endpoints.tokens(), {
      method: "POST",
      body: JSON.stringify({ label })
    })
  );
}

export function revokeToken(id: string): Promise<unknown> {
  return call(endpoints.token(id), { method: "DELETE" });
}

export async function claimScope(name: string): Promise<ClaimedScope> {
  return mapClaimedScope(
    await call<ClaimedScopeDto>(endpoints.scopes(), {
      method: "POST",
      body: JSON.stringify({ name })
    })
  );
}

export function archiveUrl(archive: string): string {
  return apiUrl(endpoints.packageArchive(archive));
}

export const SIGN_IN_URL = apiUrl(endpoints.signIn());
