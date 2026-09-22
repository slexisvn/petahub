import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  SIGN_IN_URL,
  claimScope,
  createToken,
  listTokens,
  messageOf,
  revokeToken
} from "../api";
import { EmptyState, Notice, Skeleton } from "../components/Feedback";
import { Icon } from "../components/Icon";
import { RelativeTime } from "../components/RelativeTime";
import { Snippet } from "../components/Snippet";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { scopePath } from "../lib/routes";
import { CLIENT_NAME, EXAMPLE_PACKAGE, EXAMPLE_SCOPE, EXAMPLE_SIBLING } from "../lib/site";
import type { Identity, TokenSummary } from "../models";
import { Link } from "react-router";

type Props = {
  readonly identity: Identity | null;
  readonly loading: boolean;
  readonly onChange: () => void;
};

function Scopes({
  identity,
  onChange
}: {
  readonly identity: Identity;
  readonly onChange: () => void;
}): JSX.Element {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (name.trim().length === 0) return;
    setBusy(true);
    setError(null);
    claimScope(name.trim())
      .then(() => {
        setName("");
        onChange();
      })
      .catch((issue: unknown) => setError(messageOf(issue)))
      .finally(() => setBusy(false));
  };

  return (
    <section className="section" aria-labelledby="scopes-heading">
      <div className="section__head">
        <h2 id="scopes-heading">Scopes</h2>
      </div>
      <p className="muted small" style={{ maxWidth: "40rem" }}>
        A scope is the first segment of a package name and it is owned by one account. Owning{" "}
        <code>{EXAMPLE_SCOPE}</code> lets you publish <code>{EXAMPLE_PACKAGE}</code>,{" "}
        <code>{EXAMPLE_SIBLING}</code>, and anything else beneath it.
      </p>

      <div style={{ marginTop: "1rem" }}>
        {identity.scopes.length === 0 ? (
          <p className="muted small">You do not own a scope yet.</p>
        ) : (
          <div className="scope-chips">
            {identity.scopes.map((scope) => (
              <Link key={scope} className="badge badge--accent" to={scopePath(scope)}>
                <Icon name="tag" className="btn__icon" />
                {scope}
              </Link>
            ))}
          </div>
        )}
      </div>

      <form
        className="row"
        style={{ marginTop: "1.25rem" }}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="visually-hidden" htmlFor="scope-name">
          Scope to claim
        </label>
        <input
          id="scope-name"
          className="input"
          value={name}
          placeholder="scope name"
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
          style={{ maxWidth: "14rem" }}
        />
        <button type="submit" className="btn btn--primary" disabled={busy}>
          Claim scope
        </button>
      </form>

      {error === null ? null : (
        <div style={{ marginTop: "1rem" }}>
          <Notice tone="bad" title="That scope could not be claimed">
            <p>{error}</p>
          </Notice>
        </div>
      )}
    </section>
  );
}

function Tokens(): JSX.Element {
  const [tokens, setTokens] = useState<readonly TokenSummary[]>([]);
  const [issued, setIssued] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    listTokens()
      .then((result) => setTokens(result.tokens))
      .catch((issue: unknown) => setError(messageOf(issue)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(reload, [reload]);

  const create = () => {
    if (label.trim().length === 0) return;
    setError(null);
    createToken(label.trim())
      .then((created) => {
        setIssued(created.token);
        setLabel("");
        reload();
      })
      .catch((issue: unknown) => setError(messageOf(issue)));
  };

  return (
    <section className="section" aria-labelledby="tokens-heading">
      <div className="section__head">
        <h2 id="tokens-heading">Publishing tokens</h2>
      </div>
      <p className="muted small" style={{ maxWidth: "40rem" }}>
        A token is how <code>{CLIENT_NAME} publish</code> proves who you are. It is shown once, here,
        and stored only as a sha256 hash — nobody can read it back, including this site.
      </p>

      <form
        className="row"
        style={{ marginTop: "1.25rem" }}
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
      >
        <label className="visually-hidden" htmlFor="token-label">
          Token label
        </label>
        <input
          id="token-label"
          className="input"
          value={label}
          placeholder="laptop, ci, …"
          autoComplete="off"
          onChange={(event) => setLabel(event.target.value)}
          style={{ maxWidth: "14rem" }}
        />
        <button type="submit" className="btn">
          <Icon name="key" className="btn__icon" />
          New token
        </button>
      </form>

      {issued === null ? null : (
        <div className="stack" style={{ marginTop: "1.25rem" }}>
          <Notice tone="good" title="Copy this token now — it will not be shown again." />
          <Snippet text={issued} label="token" />
          <p className="small muted">Then, in a terminal:</p>
          <Snippet
            text={`${CLIENT_NAME} login --registry ${location.origin}`}
            prompt="$"
            label="login command"
          />
        </div>
      )}

      {error === null ? null : (
        <div style={{ marginTop: "1rem" }}>
          <Notice tone="bad" title="Token request failed">
            <p>{error}</p>
          </Notice>
        </div>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        {loading ? (
          <Skeleton height="6rem" />
        ) : tokens.length === 0 ? (
          <EmptyState icon="key" title="No tokens yet">
            <p>Issue one above, then run {CLIENT_NAME} login on the machine that publishes.</p>
          </EmptyState>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="token-table">
              <thead>
                <tr>
                  <th scope="col">Label</th>
                  <th scope="col">Created</th>
                  <th scope="col">Last used</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.id}>
                    <td>{token.label}</td>
                    <td className="muted">
                      <RelativeTime iso={token.createdAt} />
                    </td>
                    <td className="muted">
                      {token.lastUsedAt === null ? (
                        "never"
                      ) : (
                        <RelativeTime iso={token.lastUsedAt} />
                      )}
                    </td>
                    <td className="token-table__actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--danger"
                        aria-label={`Revoke the token labelled ${token.label}`}
                        onClick={() => {
                          void revokeToken(token.id).then(reload);
                        }}
                      >
                        <Icon name="trash" className="btn__icon" />
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export function AccountPage({ identity, loading, onChange }: Props): JSX.Element {
  useDocumentTitle("Account");

  if (loading) {
    return (
      <div className="page" aria-busy="true">
        <Skeleton width="14rem" height="1.9rem" />
        <div style={{ marginTop: "2rem" }}>
          <Skeleton height="8rem" />
        </div>
      </div>
    );
  }

  if (identity === null) {
    return (
      <div className="page">
        <h1>Account</h1>
        <div style={{ marginTop: "2rem" }}>
          <EmptyState
            icon="user"
            title="You are signed out"
            action={
              <a className="btn btn--primary" href={SIGN_IN_URL}>
                <Icon name="github" className="btn__icon" />
                Sign in with GitHub
              </a>
            }
          >
            <p>Sign in to claim a scope and issue the token that {CLIENT_NAME} publishes with.</p>
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{identity.name ?? identity.login}</h1>
      <p className="muted small">signed in as {identity.login}</p>
      <Scopes identity={identity} onChange={onChange} />
      <Tokens />
    </div>
  );
}
