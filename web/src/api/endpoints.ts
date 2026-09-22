const API_ROOT = "/api/v1";
const AUTH_ROOT = `${API_ROOT}/auth`;

function encoded(value: string): string {
  return encodeURIComponent(value);
}

function withQuery(path: string, params: Readonly<Record<string, string>>): string {
  const query = new URLSearchParams(params).toString();
  return query.length === 0 ? path : `${path}?${query}`;
}

export const endpoints = {
  packageArchive: (archive: string) => `/${archive}`,
  packageDependents: (name: string) => `${API_ROOT}/packages/${encoded(name)}/dependents`,
  packageDetail: (name: string) => `${API_ROOT}/packages/${encoded(name)}`,
  packages: (query: string) =>
    withQuery(`${API_ROOT}/packages`, query.length === 0 ? {} : { q: query }),
  scopes: () => `${API_ROOT}/scopes`,
  signIn: () => `${AUTH_ROOT}/github`,
  tokens: () => `${AUTH_ROOT}/tokens`,
  token: (id: string) => `${AUTH_ROOT}/tokens/${encoded(id)}`,
  whoami: () => `${AUTH_ROOT}/whoami`,
  logout: () => `${AUTH_ROOT}/logout`
} as const;
