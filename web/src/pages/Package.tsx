import type { JSX, ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { isNotFound, messageOf, packageDependents, packageDetail } from "../api";
import { Breadcrumb } from "../components/Breadcrumb";
import { EmptyState, Notice, Skeleton } from "../components/Feedback";
import { Icon } from "../components/Icon";
import { Markdown } from "../components/Markdown";
import { PackageName } from "../components/PackageName";
import { ReleaseRow } from "../components/ReleaseRow";
import { RelativeTime } from "../components/RelativeTime";
import { Snippet } from "../components/Snippet";
import { useAsync } from "../hooks/useAsync";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { formatBytes, formatCount, formatDate, pluralise } from "../lib/format";
import { byVersionDescending, caretRange, latestRelease, totalDownloads } from "../lib/releases";
import { packagePath, scopePath, versionPath } from "../lib/routes";
import { CLIENT_NAME } from "../lib/site";
import { NotFoundPage } from "./NotFound";

const TAB_PARAM = "tab";
const DEFAULT_TAB = "readme";

type TabKey = "readme" | "versions" | "dependencies" | "dependents";

const TAB_LABELS: Record<TabKey, string> = {
  readme: "Readme",
  versions: "Versions",
  dependencies: "Dependencies",
  dependents: "Dependents"
};

const TAB_KEYS = Object.keys(TAB_LABELS) as readonly TabKey[];
const PANEL_ID = "package-panel";
const ARROW_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

function MetaItem({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="meta-list__item">
      <span className="meta-list__label">{label}</span>
      <span className="meta-list__value">{children}</span>
    </div>
  );
}

function DependencyList({
  dependencies
}: {
  readonly dependencies: Record<string, string>;
}): JSX.Element {
  const entries = Object.entries(dependencies).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) {
    return (
      <EmptyState icon="box" title="No dependencies">
        <p>This release depends on nothing but the language itself.</p>
      </EmptyState>
    );
  }
  return (
    <ul className="dep-list">
      {entries.map(([name, range]) => (
        <li key={name} className="dep-list__item">
          <Link to={packagePath(name)}>
            <PackageName name={name} />
          </Link>
          <code className="dep-list__range">{range}</code>
        </li>
      ))}
    </ul>
  );
}

function PackageSkeleton(): JSX.Element {
  return (
    <div className="page" aria-busy="true">
      <div style={{ maxWidth: "24rem" }}>
        <Skeleton width="14rem" height="1.9rem" />
      </div>
      <div style={{ marginTop: "1rem", maxWidth: "32rem" }}>
        <Skeleton width="100%" height="1rem" />
      </div>
      <div style={{ marginTop: "2rem", maxWidth: "26rem" }}>
        <Skeleton width="100%" height="2.75rem" />
      </div>
      <div style={{ marginTop: "2rem" }}>
        <Skeleton width="100%" height="12rem" />
      </div>
    </div>
  );
}

export function PackagePage(): JSX.Element {
  const { name = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const detail = useAsync(() => packageDetail(name), [name]);
  const dependents = useAsync(() => packageDependents(name), [name]);

  useDocumentTitle(detail.data === null ? name : detail.data.name);

  if (detail.loading) return <PackageSkeleton />;
  if (detail.data === null) {
    if (isNotFound(detail.error)) {
      return (
        <NotFoundPage title={`No package named ${name}`}>
          <p>
            Package names are dotted import paths such as <code>scope.name</code>. Check the
            spelling, or search the registry.
          </p>
        </NotFoundPage>
      );
    }
    return (
      <div className="page">
        <Notice tone="bad" title="This package could not be loaded">
          <p>{messageOf(detail.error)}</p>
        </Notice>
      </div>
    );
  }

  const pkg = detail.data;
  const ordered = byVersionDescending(pkg.releases);
  const latest = latestRelease(pkg.releases);
  const shown = latest ?? ordered[0] ?? null;
  const dependentList = dependents.data?.dependents ?? [];
  const allYanked = pkg.releases.length > 0 && latest === null;

  const counts: Record<TabKey, number | null> = {
    readme: null,
    versions: pkg.releases.length,
    dependencies: shown === null ? 0 : Object.keys(shown.dependencies).length,
    dependents: dependentList.length
  };

  const requested = params.get(TAB_PARAM);
  const tab: TabKey = requested !== null && requested in TAB_LABELS ? (requested as TabKey) : DEFAULT_TAB;

  const selectTab = (key: TabKey) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (key === DEFAULT_TAB) next.delete(TAB_PARAM);
        else next.set(TAB_PARAM, key);
        return next;
      },
      { replace: true }
    );
  };

  return (
    <div className="page">
      <Breadcrumb
        crumbs={[
          { label: "Packages", to: "/search" },
          { label: pkg.scope, to: scopePath(pkg.scope) },
          { label: pkg.name }
        ]}
      />

      <div className="pkg-layout">
        <div>
          <header className="pkg-head">
            <div className="pkg-head__title">
              <h1 className="pkg-head__name">
                <PackageName name={pkg.name} />
              </h1>
              {shown === null ? null : (
                <span className="pkg-head__version">{shown.version}</span>
              )}
              {allYanked ? <span className="badge badge--warn">all versions yanked</span> : null}
            </div>
            {pkg.description === null ? null : (
              <p className="pkg-head__description">{pkg.description}</p>
            )}
          </header>

          {allYanked ? (
            <div style={{ marginTop: "1.5rem" }}>
              <Notice tone="warn" title="Every version of this package is yanked">
                <p>
                  No new resolution will select it. A lockfile that already pinned a version keeps
                  working — yanking never deletes a release.
                </p>
              </Notice>
            </div>
          ) : null}

          {shown === null || allYanked ? null : (
            <section className="section" aria-labelledby="install-heading">
              <h2 id="install-heading" className="visually-hidden">
                Install
              </h2>
              <div className="stack">
                <Snippet
                  text={`${CLIENT_NAME} install ${pkg.name}`}
                  prompt="$"
                  label="install command"
                />
                <div>
                  <p className="small muted" style={{ marginBottom: "0.5rem" }}>
                    Or add it to <code>tera.json</code>:
                  </p>
                  <Snippet
                    text={`"${pkg.name}": "${caretRange(shown.version)}"`}
                    label="manifest entry"
                  />
                </div>
                <p className="small muted">
                  Then <code>import {pkg.name}</code> — the package name is the import path.
                </p>
              </div>
            </section>
          )}

          <div className="tabs" role="tablist" aria-label="Package details">
            {TAB_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`tab-${key}`}
                className="tab"
                aria-selected={tab === key}
                aria-controls={PANEL_ID}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => selectTab(key)}
                onKeyDown={(event) => {
                  const step = ARROW_STEPS[event.key];
                  if (step === undefined) return;
                  event.preventDefault();
                  const at = TAB_KEYS.indexOf(tab);
                  const next = TAB_KEYS[(at + step + TAB_KEYS.length) % TAB_KEYS.length]!;
                  selectTab(next);
                  document.getElementById(`tab-${next}`)?.focus();
                }}
              >
                {TAB_LABELS[key]}
                {counts[key] === null ? null : <span className="tab__count">{counts[key]}</span>}
              </button>
            ))}
          </div>

          <div
            id={PANEL_ID}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            tabIndex={0}
            style={{ marginTop: "1.5rem" }}
          >
            {tab === "readme" ? (
              pkg.readme === null || pkg.readme.trim().length === 0 ? (
                <EmptyState icon="inbox" title="No readme">
                  <p>
                    This package shipped no <code>README.md</code>. The author can add one and
                    publish a new version.
                  </p>
                </EmptyState>
              ) : (
                <Markdown source={pkg.readme} />
              )
            ) : null}

            {tab === "versions" ? (
              ordered.length === 0 ? (
                <EmptyState icon="inbox" title="No releases yet" />
              ) : (
                <div className="releases">
                  {ordered.map((release) => (
                    <ReleaseRow key={release.version} name={pkg.name} release={release} />
                  ))}
                </div>
              )
            ) : null}

            {tab === "dependencies" ? (
              shown === null ? (
                <EmptyState icon="inbox" title="No releases yet" />
              ) : (
                <>
                  <p className="small muted" style={{ marginBottom: "1rem" }}>
                    Required by version {shown.version}.
                  </p>
                  <DependencyList dependencies={shown.dependencies} />
                </>
              )
            ) : null}

            {tab === "dependents" ? (
              dependents.loading ? (
                <Skeleton height="6rem" />
              ) : dependentList.length === 0 ? (
                <EmptyState icon="box" title="No dependents yet">
                  <p>
                    No package on this registry lists {pkg.name} in the dependencies of its latest
                    release.
                  </p>
                </EmptyState>
              ) : (
                <ul className="dep-list">
                  {dependentList.map((dependent) => (
                    <li key={dependent.name} className="dep-list__item">
                      <span>
                        <Link to={packagePath(dependent.name)}>
                          <PackageName name={dependent.name} />
                        </Link>
                        {dependent.description === null ? null : (
                          <span className="muted small"> — {dependent.description}</span>
                        )}
                      </span>
                      <code className="dep-list__range">{dependent.range}</code>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </div>
        </div>

        <aside className="pkg-layout__aside">
          <div className="card aside-card">
            <h2 className="aside-card__title">About</h2>
            <div className="meta-list">
              <MetaItem label="Scope">
                <Link to={scopePath(pkg.scope)}>
                  <code>{pkg.scope}</code>
                </Link>
              </MetaItem>
              <MetaItem label="Owner">{pkg.owner}</MetaItem>
              {pkg.repository === null ? null : (
                <MetaItem label="Repository">
                  <a href={pkg.repository} rel="noopener noreferrer nofollow">
                    {pkg.repository.replace(/^https?:\/\//, "")}
                    <Icon name="external" className="btn__icon" />
                  </a>
                </MetaItem>
              )}
              <MetaItem label="First published">{formatDate(pkg.createdAt)}</MetaItem>
              <MetaItem label="Downloads">
                {formatCount(totalDownloads(pkg.releases))} across{" "}
                {pkg.releases.length} {pluralise(pkg.releases.length, "release")}
              </MetaItem>
              {shown === null ? null : (
                <>
                  <MetaItem label={`Version ${shown.version}`}>
                    {formatBytes(shown.bytes)} · {shown.files}{" "}
                    {pluralise(shown.files, "file")} · published{" "}
                    <RelativeTime iso={shown.publishedAt} /> by {shown.publishedBy}
                  </MetaItem>
                  <div className="meta-list__item">
                    <span className="meta-list__label">Integrity</span>
                    <span className="meta-list__value meta-list__value--mono">
                      {shown.integrity}
                    </span>
                  </div>
                  <MetaItem label="Archive">
                    <Link to={versionPath(pkg.name, shown.version)}>
                      Version detail and download
                    </Link>
                  </MetaItem>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
