import type { JSX } from "react";
import { Link } from "react-router";
import { CLIENT_NAME, CLIENT_REPOSITORY, LANGUAGE_NAME, SITE_NAME } from "../lib/site";

export function Footer(): JSX.Element {
  return (
    <footer className="site-footer">
      <div className="page site-footer__inner">
        <span>
          {SITE_NAME} — the package registry for {LANGUAGE_NAME}
        </span>
        <div className="site-footer__links">
          <Link to="/about">How it works</Link>
          <Link to="/search">Browse</Link>
          <a href={CLIENT_REPOSITORY}>{CLIENT_NAME} client</a>
        </div>
      </div>
    </footer>
  );
}
