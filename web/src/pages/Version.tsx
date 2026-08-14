import type { JSX } from "react";
import { Link, useParams } from "react-router";
import { archiveUrl, isNotFound, messageOf, packageDetail } from "../api";
import { Breadcrumb } from "../components/Breadcrumb";
import { EmptyState, Notice, Skeleton } from "../components/Feedback";
import { Icon } from "../components/Icon";
import { PackageName } from "../components/PackageName";
import { RelativeTime } from "../components/RelativeTime";
import { Snippet } from "../components/Snippet";
import { useAsync } from "../hooks/useAsync";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { formatBytes, formatCount, formatExactDate, pluralise } from "../lib/format";
import { caretRange, isPrereleaseVersion } from "../lib/releases";
import { packagePath, scopePath } from "../lib/routes";
import { CLIENT_NAME } from "../lib/site";
import { NotFoundPage } from "./NotFound";

export function VersionPage(): JSX.Element {
  const { name = "", version = "" } = useParams();
  const { data, error, loading } = useAsync(() => packageDetail(name), [name]);

  useDocumentTitle(`${name} ${version}`);

  if (loading) {
    return (
      <div className="page" aria-busy="true">
        <Skeleton width="18rem" height="1.9rem" />
        <div style={{ marginTop: "2rem" }}>
          <Skeleton height="10rem" />
        </div>
      </div>
    );
  }

  if (data === null) {
    if (isNotFound(error)) return <NotFoundPage title={`No package named ${name}`} />;
    return (
      <div className="page">
        <Notice tone="bad" title="This release could not be loaded">
          <p>{messageOf(error)}</p>
        </Notice>
      </div>
    );
  }

  const release = data.releases.find((entry) => entry.version === version);
  if (release === undefined) {
    return (
      <NotFoundPage title={`${data.name} has no version ${version}`}>
        <p>
          <Link to={`${packagePath(data.name)}?tab=versions`}>See every published version</Link> of
          this package.
        </p>
      </NotFoundPage>
    );
  }

  const dependencies = Object.entries(release.dependencies).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  return (
    <div className="page">
      <Breadcrumb
        crumbs={[
          { label: "Packages", to: "/search" },
          { label: data.scope, to: scopePath(data.scope) },
          { label: data.name, to: packagePath(data.name) },
          { label: release.version }
        ]}
      />

      <div className="pkg-layout">
        <div>
          <header className="pkg-head">
            <div className="pkg-head__title">
              <h1 className="pkg-head__name">
                <PackageName name={data.name} />
              </h1>
              <span className="pkg-head__version">{release.version}</span>
              {release.yanked ? <span className="badge badge--warn">yanked</span> : null}
              {isPrereleaseVersion(release.version) ? (
                <span className="badge">pre-release</span>
              ) : null}
            </div>
            <p className="pkg-head__description muted small">
              Published <RelativeTime iso={release.publishedAt} /> by {release.publishedBy}
            </p>
          </header>

          {release.yanked ? (
            <div style={{ marginTop: "1.5rem" }}>
              <Notice tone="warn" title="This version is yanked">
                <p>
                  New resolutions will not select it, but it was never deleted: a lockfile that
                  already pinned {release.version} still installs these exact bytes.
                </p>
              </Notice>
            </div>
          ) : null}

          <section className="section">
            <h2>Install this version</h2>
            <div className="stack">
              <Snippet
                text={`${CLIENT_NAME} install ${data.name}@${release.version}`}
                prompt="$"
                label="install command"
              />
              <div>
                <p className="small muted" style={{ marginBottom: "0.5rem" }}>
                  Or the compatible range, in <code>tera.json</code>:
                </p>
                <Snippet
                  text={`"${data.name}": "${caretRange(release.version)}"`}
                  label="manifest entry"
                />
              </div>
            </div>
          </section>

          <section className="section">
            <h2>Dependencies</h2>
            {dependencies.length === 0 ? (
              <EmptyState icon="box" title="No dependencies">
                <p>This release depends on nothing but the language itself.</p>
              </EmptyState>
            ) : (
              <ul className="dep-list">
                {dependencies.map(([dependency, range]) => (
                  <li key={dependency} className="dep-list__item">
                    <Link to={packagePath(dependency)}>
                      <PackageName name={dependency} />
                    </Link>
                    <code className="dep-list__range">{range}</code>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="section">
            <h2>Integrity</h2>
            <p className="small muted" style={{ marginBottom: "0.75rem" }}>
              Verified by <code>{CLIENT_NAME}</code> on every download and on every cache hit, not
              just the first.
            </p>
            <Snippet text={release.integrity} label="integrity hash" />
          </section>
        </div>

        <aside className="pkg-layout__aside">
          <div className="card aside-card">
            <h2 className="aside-card__title">This release</h2>
            <div className="meta-list">
              <div className="meta-list__item">
                <span className="meta-list__label">Archive size</span>
                <span className="meta-list__value">{formatBytes(release.bytes)}</span>
              </div>
              <div className="meta-list__item">
                <span className="meta-list__label">Files</span>
                <span className="meta-list__value">{release.files}</span>
              </div>
              <div className="meta-list__item">
                <span className="meta-list__label">Downloads</span>
                <span className="meta-list__value">
                  {formatCount(release.downloads)}{" "}
                  {pluralise(release.downloads, "download")}
                </span>
              </div>
              <div className="meta-list__item">
                <span className="meta-list__label">Published</span>
                <span className="meta-list__value">{formatExactDate(release.publishedAt)}</span>
              </div>
              <div className="meta-list__item">
                <span className="meta-list__label">Published by</span>
                <span className="meta-list__value">{release.publishedBy}</span>
              </div>
            </div>
            <div style={{ marginTop: "1.25rem" }}>
              <a className="btn" href={archiveUrl(release.archive)} download>
                <Icon name="download" className="btn__icon" />
                Download .tpkg
              </a>
            </div>
          </div>

          <div className="card aside-card">
            <h2 className="aside-card__title">Other versions</h2>
            <p className="small muted">
              <Link to={`${packagePath(data.name)}?tab=versions`}>
                {data.releases.length} {pluralise(data.releases.length, "release")} published
              </Link>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
