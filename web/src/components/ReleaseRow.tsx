import type { JSX } from "react";
import { Link } from "react-router";
import type { Release } from "../api";
import { formatBytes, formatCount, pluralise } from "../lib/format";
import { isPrereleaseVersion } from "../lib/releases";
import { versionPath } from "../lib/routes";
import { RelativeTime } from "./RelativeTime";

type Props = {
  readonly name: string;
  readonly release: Release;
};

export function ReleaseRow({ name, release }: Props): JSX.Element {
  return (
    <Link
      className={release.yanked ? "release release--yanked" : "release"}
      to={versionPath(name, release.version)}
    >
      <span className="release__version">
        {release.version}
        {release.yanked ? <span className="badge badge--warn">yanked</span> : null}
        {isPrereleaseVersion(release.version) ? (
          <span className="badge">pre-release</span>
        ) : null}
      </span>
      <span className="release__stats">
        <span className="release__stat">{formatBytes(release.bytes)}</span>
        <span className="release__stat">
          {release.files} {pluralise(release.files, "file")}
        </span>
        <span className="release__stat">
          {formatCount(release.downloads)} {pluralise(release.downloads, "download")}
        </span>
      </span>
      <span className="release__when muted">
        <RelativeTime iso={release.publishedAt} />
      </span>
    </Link>
  );
}
