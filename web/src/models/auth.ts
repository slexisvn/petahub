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

export type TokenList = {
  readonly tokens: readonly TokenSummary[];
};

export type CreatedToken = {
  readonly id: string;
  readonly label: string;
  readonly token: string;
};

export type ClaimedScope = {
  readonly name: string;
};
