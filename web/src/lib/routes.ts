export const SEARCH_QUERY_PARAM = "q";
export const SEARCH_SORT_PARAM = "sort";

export function packagePath(name: string): string {
  return `/packages/${encodeURIComponent(name)}`;
}

export function versionPath(name: string, version: string): string {
  return `${packagePath(name)}/${encodeURIComponent(version)}`;
}

export function searchPath(query: string): string {
  return query.length === 0
    ? "/search"
    : `/search?${SEARCH_QUERY_PARAM}=${encodeURIComponent(query)}`;
}

export function scopePath(scope: string): string {
  return searchPath(scope);
}
