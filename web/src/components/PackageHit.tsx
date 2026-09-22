import type { JSX } from "react";
import { Link } from "react-router";
import { formatCount, formatExactCount, pluralise } from "../lib/format";
import { isPrereleaseVersion } from "../lib/releases";
import { packagePath } from "../lib/routes";
import type { SearchHit } from "../models";
import { PackageName } from "./PackageName";
import { RelativeTime } from "./RelativeTime";

type Props = {
  readonly hit: SearchHit;
};

export function PackageHit({ hit }: Props): JSX.Element {
  return (
    <Link className="hit" to={packagePath(hit.name)}>
      <div className="hit__head">
        <PackageName name={hit.name} className="hit__name" />
        {hit.latest === null ? (
          <span className="badge badge--warn">all versions yanked</span>
        ) : (
          <>
            <span className="hit__version">{hit.latest}</span>
            {isPrereleaseVersion(hit.latest) ? <span className="badge">pre-release</span> : null}
          </>
        )}
        <div className="hit__meta">
          <span title={`${formatExactCount(hit.downloads)} ${pluralise(hit.downloads, "download")}`}>
            {formatCount(hit.downloads)} {pluralise(hit.downloads, "download")}
          </span>
          <RelativeTime iso={hit.updatedAt} />
        </div>
      </div>
      {hit.description === null ? null : <p className="hit__description">{hit.description}</p>}
    </Link>
  );
}
