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
  readonly dependencies: Readonly<Record<string, string>>;
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

export type SearchResult = {
  readonly limit: number;
  readonly packages: readonly SearchHit[];
};

export type DependentsResult = {
  readonly dependents: readonly Dependent[];
};
