import type { JSX } from "react";
import { Link } from "react-router";
import { SITE_NAME, SITE_TAGLINE } from "../lib/site";

export function BrandMark({ className }: { readonly className?: string }): JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="3.5" width="18" height="4.6" rx="1.6" fill="var(--accent)" />
      <rect x="3" y="9.7" width="18" height="4.6" rx="1.6" fill="currentColor" opacity="0.55" />
      <rect x="5.4" y="15.9" width="13.2" height="4.6" rx="1.6" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

export function Brand(): JSX.Element {
  return (
    <Link to="/" className="brand">
      <BrandMark className="brand__mark" />
      <span className="brand__name">{SITE_NAME}</span>
      <span className="brand__tag">{SITE_TAGLINE}</span>
    </Link>
  );
}
