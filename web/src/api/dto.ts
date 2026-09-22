export type SearchHitDto = {
  readonly name: string;
  readonly description: string | null;
  readonly latest: string | null;
  readonly downloads: number;
  readonly updatedAt: string;
};

export type SearchResultDto = {
  readonly limit: number;
  readonly packages: readonly SearchHitDto[];
};

export type ReleaseDto = {
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

export type PackageDetailDto = {
  readonly name: string;
  readonly description: string | null;
  readonly repository: string | null;
  readonly readme: string | null;
  readonly owner: string;
  readonly scope: string;
  readonly createdAt: string;
  readonly releases: readonly ReleaseDto[];
};

export type DependentDto = {
  readonly name: string;
  readonly description: string | null;
  readonly version: string;
  readonly range: string;
};

export type DependentsResultDto = {
  readonly dependents: readonly DependentDto[];
};

export type IdentityDto = {
  readonly login: string;
  readonly name: string | null;
  readonly avatarUrl: string | null;
  readonly scopes: readonly string[];
};

export type TokenSummaryDto = {
  readonly id: string;
  readonly label: string;
  readonly createdAt: string;
  readonly lastUsedAt: string | null;
};

export type TokenListDto = {
  readonly tokens: readonly TokenSummaryDto[];
};

export type CreatedTokenDto = {
  readonly id: string;
  readonly label: string;
  readonly token: string;
};

export type ClaimedScopeDto = {
  readonly name: string;
};
