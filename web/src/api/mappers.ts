import type {
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
} from "../models";
import type {
  ClaimedScopeDto,
  CreatedTokenDto,
  DependentDto,
  DependentsResultDto,
  IdentityDto,
  PackageDetailDto,
  ReleaseDto,
  SearchHitDto,
  SearchResultDto,
  TokenListDto,
  TokenSummaryDto
} from "./dto";

const textByName = ([left]: readonly [string, string], [right]: readonly [string, string]) =>
  left.localeCompare(right);

function dependenciesOf(dependencies: Record<string, string>): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(dependencies).sort(textByName));
}

export function mapSearchHit(dto: SearchHitDto): SearchHit {
  return {
    name: dto.name,
    description: dto.description,
    latest: dto.latest,
    downloads: dto.downloads,
    updatedAt: dto.updatedAt
  };
}

export function mapSearchResult(dto: SearchResultDto): SearchResult {
  return { limit: dto.limit, packages: dto.packages.map(mapSearchHit) };
}

export function mapRelease(dto: ReleaseDto): Release {
  return {
    version: dto.version,
    integrity: dto.integrity,
    archive: dto.archive,
    bytes: dto.bytes,
    files: dto.files,
    dependencies: dependenciesOf(dto.dependencies),
    yanked: dto.yanked,
    downloads: dto.downloads,
    publishedAt: dto.publishedAt,
    publishedBy: dto.publishedBy
  };
}

export function mapPackageDetail(dto: PackageDetailDto): PackageDetail {
  return {
    name: dto.name,
    description: dto.description,
    repository: dto.repository,
    readme: dto.readme,
    owner: dto.owner,
    scope: dto.scope,
    createdAt: dto.createdAt,
    releases: dto.releases.map(mapRelease)
  };
}

export function mapDependent(dto: DependentDto): Dependent {
  return {
    name: dto.name,
    description: dto.description,
    version: dto.version,
    range: dto.range
  };
}

export function mapDependentsResult(dto: DependentsResultDto): DependentsResult {
  return { dependents: dto.dependents.map(mapDependent) };
}

export function mapIdentity(dto: IdentityDto): Identity {
  return {
    login: dto.login,
    name: dto.name,
    avatarUrl: dto.avatarUrl,
    scopes: [...dto.scopes].sort((left, right) => left.localeCompare(right))
  };
}

export function mapTokenSummary(dto: TokenSummaryDto): TokenSummary {
  return {
    id: dto.id,
    label: dto.label,
    createdAt: dto.createdAt,
    lastUsedAt: dto.lastUsedAt
  };
}

export function mapTokenList(dto: TokenListDto): TokenList {
  return { tokens: dto.tokens.map(mapTokenSummary) };
}

export function mapCreatedToken(dto: CreatedTokenDto): CreatedToken {
  return {
    id: dto.id,
    label: dto.label,
    token: dto.token
  };
}

export function mapClaimedScope(dto: ClaimedScopeDto): ClaimedScope {
  return { name: dto.name };
}
