import type { JSX } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { messageOf, searchPackages } from "../api";
import { EmptyState, SkeletonList } from "../components/Feedback";
import { Icon } from "../components/Icon";
import { PackageHit } from "../components/PackageHit";
import { SearchBox } from "../components/SearchBox";
import { Snippet } from "../components/Snippet";
import { useAsync } from "../hooks/useAsync";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { GUARANTEES } from "../lib/guarantees";
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
  const featured = [...packages].sort((left, right) => right.downloads - left.downloads)[0];

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
        {featured === undefined ? null : (
          <div className="hero__install">
            <Snippet
              text={`${CLIENT_NAME} install ${featured.name}`}
              prompt="$"
              label="install command"
            />
          </div>
        )}
      </section>

      <section aria-labelledby="guarantees-heading">
        <h2 id="guarantees-heading" className="visually-hidden">
          What this registry guarantees
        </h2>
        <div className="guarantees">
          {GUARANTEES.map((guarantee) => (
            <article key={guarantee.title} className="guarantee">
              <Icon name={guarantee.icon} className="guarantee__icon" />
              <h3 className="guarantee__title">{guarantee.title}</h3>
              <p className="guarantee__body">{guarantee.body}</p>
            </article>
          ))}
        </div>
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
