import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { messageOf, searchPackages } from "../api";
import { EmptyState, Notice, SkeletonList } from "../components/Feedback";
import { PackageHit } from "../components/PackageHit";
import { SearchBox } from "../components/SearchBox";
import { useAsync } from "../hooks/useAsync";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { formatExactCount, pluralise } from "../lib/format";
import { SEARCH_QUERY_PARAM, SEARCH_SORT_PARAM } from "../lib/routes";
import { CLIENT_NAME } from "../lib/site";
import type { SearchHit } from "../models";

const DEBOUNCE_MS = 150;

type Sort = {
  readonly label: string;
  readonly compare: (left: SearchHit, right: SearchHit) => number;
};

const SORTS: Record<string, Sort> = {
  name: { label: "Name (A–Z)", compare: (left, right) => left.name.localeCompare(right.name) },
  downloads: { label: "Most downloaded", compare: (left, right) => right.downloads - left.downloads },
  recent: {
    label: "Recently updated",
    compare: (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
  }
};

const DEFAULT_SORT = "name";

export function SearchPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const query = params.get(SEARCH_QUERY_PARAM) ?? "";
  const sortKey = params.get(SEARCH_SORT_PARAM) ?? DEFAULT_SORT;
  const sort = SORTS[sortKey] ?? SORTS[DEFAULT_SORT]!;
  const [draft, setDraft] = useState(query);

  useDocumentTitle(query.length === 0 ? "Browse packages" : `Search: ${query}`);

  useEffect(() => setDraft(query), [query]);

  useEffect(() => {
    const trimmed = draft.trim();
    if (trimmed === query) return;
    const timer = setTimeout(() => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (trimmed.length === 0) next.delete(SEARCH_QUERY_PARAM);
          else next.set(SEARCH_QUERY_PARAM, trimmed);
          return next;
        },
        { replace: true }
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, query, setParams]);

  const { data, error, loading } = useAsync(() => searchPackages(query), [query]);
  const hits = data === null ? [] : [...data.packages].sort(sort.compare);
  const limit = data?.limit ?? null;
  const atLimit = limit !== null && hits.length === limit;

  return (
    <div className="page">
      <h1>{query.length === 0 ? "All packages" : "Search"}</h1>

      <form
        className="section__head"
        role="search"
        style={{ marginTop: "var(--space-5)" }}
        onSubmit={(event) => event.preventDefault()}
      >
        <div style={{ flex: 1, minWidth: "14rem" }}>
          <SearchBox
            value={draft}
            onChange={setDraft}
            placeholder="Search packages by name or description"
            label="Search packages"
            autoFocus
          />
        </div>
        <label className="row small muted" style={{ gap: "0.5rem" }}>
          Sort
          <select
            className="select"
            value={sortKey}
            onChange={(event) => {
              setParams((previous) => {
                const next = new URLSearchParams(previous);
                next.set(SEARCH_SORT_PARAM, event.target.value);
                return next;
              });
            }}
          >
            {Object.entries(SORTS).map(([key, option]) => (
              <option key={key} value={key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </form>

      <p className="small muted" aria-live="polite" style={{ marginBottom: "1rem" }}>
        {loading
          ? "Searching…"
          : error !== null
            ? ""
            : `${formatExactCount(hits.length)}${atLimit ? "+" : ""} ${pluralise(hits.length, "package")}${query.length === 0 ? "" : ` matching “${query}”`}`}
      </p>

      {error !== null ? (
        <Notice tone="bad" title="Search failed">
          <p>{messageOf(error)}</p>
        </Notice>
      ) : loading ? (
        <SkeletonList rows={5} />
      ) : hits.length === 0 ? (
        query.length === 0 ? (
          <EmptyState icon="inbox" title="Nothing published yet">
            <p>
              This registry is empty. Claim a scope on your account page, then publish with{" "}
              <code>{CLIENT_NAME} publish</code>.
            </p>
          </EmptyState>
        ) : (
          <EmptyState icon="search" title={`Nothing matches “${query}”`}>
            <p>Search matches package names and descriptions. Try a shorter or more general term.</p>
          </EmptyState>
        )
      ) : (
        <>
          <div className="hit-list">
            {hits.map((hit) => (
              <PackageHit key={hit.name} hit={hit} />
            ))}
          </div>
          {atLimit ? (
            <p className="small muted" style={{ marginTop: "1rem" }}>
              Showing the first {limit} matches. Narrow the search to see more.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
