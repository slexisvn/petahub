import type { JSX } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { messageOf, searchPackages } from "../api";
import { EmptyState, SkeletonList } from "../components/Feedback";
import { PackageHit } from "../components/PackageHit";
import { SearchBox } from "../components/SearchBox";
import { useAsync } from "../hooks/useAsync";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { searchPath } from "../lib/routes";
import { CLIENT_NAME, LANGUAGE_NAME } from "../lib/site";

const RECENT_COUNT = 6;

export function HomePage(): JSX.Element {
  useDocumentTitle(null);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data, error, loading } = useAsync(() => searchPackages(""), []);

  const packages = data?.packages ?? [];
  const recent = [...packages]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, RECENT_COUNT);

  return (
    <div className="page">
      <section className="hero">
        <h1 className="hero__title">Packages for {LANGUAGE_NAME}</h1>
        <p className="hero__lede">
          Pure tera source, resolved by <code>{CLIENT_NAME}</code>, installed without running a
          single line of anyone else's code.
        </p>
        <form
          className="hero__search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            void navigate(searchPath(query.trim()));
          }}
        >
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Search packages by name or description"
            label="Search packages"
            large
            autoFocus
          />
        </form>
      </section>

      <section className="section" aria-labelledby="recent-heading">
        <div className="section__head">
          <h2 id="recent-heading">Recently updated</h2>
          <div className="section__actions">
            <Link className="nav-link" to={searchPath("")}>
              Browse all
            </Link>
          </div>
        </div>
        {loading ? (
          <SkeletonList rows={3} />
        ) : error !== null ? (
          <EmptyState icon="alert" title="The registry could not be reached">
            <p>{messageOf(error)}</p>
          </EmptyState>
        ) : recent.length === 0 ? (
          <EmptyState icon="inbox" title="Nothing published yet">
            <p>
              This registry is empty. Claim a scope on your account page, then publish with{" "}
              <code>{CLIENT_NAME} publish</code>.
            </p>
          </EmptyState>
        ) : (
          <div className="hit-list">
            {recent.map((hit) => (
              <PackageHit key={hit.name} hit={hit} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
