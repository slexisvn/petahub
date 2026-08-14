import type { JSX } from "react";
import { Route, Routes, useLocation } from "react-router";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { useIdentity } from "./hooks/useIdentity";
import { AboutPage } from "./pages/About";
import { AccountPage } from "./pages/Account";
import { HomePage } from "./pages/Home";
import { NotFoundPage } from "./pages/NotFound";
import { PackagePage } from "./pages/Package";
import { SearchPage } from "./pages/Search";
import { VersionPage } from "./pages/Version";

const HEADER_SEARCH_HIDDEN = new Set(["/", "/search"]);

export function App(): JSX.Element {
  const { identity, loading, refresh } = useIdentity();
  const { pathname } = useLocation();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header
        identity={identity}
        loading={loading}
        onSignOut={refresh}
        showSearch={!HEADER_SEARCH_HIDDEN.has(pathname)}
      />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/packages/:name" element={<PackagePage />} />
          <Route path="/packages/:name/:version" element={<VersionPage />} />
          <Route
            path="/account"
            element={<AccountPage identity={identity} loading={loading} onChange={refresh} />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
