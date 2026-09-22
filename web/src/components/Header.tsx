import type { JSX } from "react";
import { NavLink, useNavigate } from "react-router";
import { useState } from "react";
import { SIGN_IN_URL, logout } from "../api";
import { searchPath } from "../lib/routes";
import type { Identity } from "../models";
import { Brand } from "./Brand";
import { Icon } from "./Icon";
import { SearchBox } from "./SearchBox";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  readonly identity: Identity | null;
  readonly loading: boolean;
  readonly onSignOut: () => void;
  readonly showSearch: boolean;
};

export function Header({ identity, loading, onSignOut, showSearch }: Props): JSX.Element {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  return (
    <header className="site-header">
      <div className="page site-header__inner">
        <Brand />
        {showSearch ? (
          <form
            className="site-header__search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              void navigate(searchPath(query.trim()));
            }}
          >
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder="Search packages"
              label="Search packages"
            />
          </form>
        ) : null}
        <nav className="site-header__nav" aria-label="Account">
          <ThemeToggle />
          {loading ? null : identity === null ? (
            <a className="btn" href={SIGN_IN_URL}>
              <Icon name="github" className="btn__icon" />
              Sign in
            </a>
          ) : (
            <>
              <NavLink className="nav-link" to="/account">
                {identity.avatarUrl === null ? (
                  <Icon name="user" className="btn__icon" />
                ) : (
                  <img className="avatar" src={identity.avatarUrl} alt="" />
                )}
                <span className="visually-hidden">Account: </span>
                {identity.login}
              </NavLink>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  void logout().then(onSignOut);
                }}
              >
                Sign out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
