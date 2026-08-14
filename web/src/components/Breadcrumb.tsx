import type { JSX } from "react";
import { Fragment } from "react";
import { Link } from "react-router";
import { Icon } from "./Icon";

export type Crumb = {
  readonly label: string;
  readonly to?: string;
};

export function Breadcrumb({ crumbs }: { readonly crumbs: readonly Crumb[] }): JSX.Element {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => (
        <Fragment key={crumb.label}>
          {index === 0 ? null : <Icon name="chevron" className="btn__icon" />}
          {crumb.to === undefined ? (
            <span aria-current="page">{crumb.label}</span>
          ) : (
            <Link to={crumb.to}>{crumb.label}</Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
