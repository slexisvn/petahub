import type { JSX } from "react";
import { Icon } from "../components/Icon";
import { Snippet } from "../components/Snippet";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { GUARANTEES } from "../lib/guarantees";
import {
  MODULE_EXTENSION,
  PACKAGES_DIRECTORY,
  SEGMENT_SEPARATOR
} from "@slexisvn/peta/browser";
import {
  CLIENT_NAME,
  EXAMPLE_MODULE,
  EXAMPLE_SIBLING,
  LANGUAGE_NAME,
  SITE_NAME
} from "../lib/site";

export function AboutPage(): JSX.Element {
  useDocumentTitle("How it works");

  return (
    <div className="page">
      <h1>How {SITE_NAME} works</h1>
      <p className="hero__lede" style={{ margin: "1rem 0 0", maxWidth: "42rem", textAlign: "left" }}>
        Most of what is unusual here comes from one fact about {LANGUAGE_NAME}: a module's identity
        is its import path. Everything else follows.
      </p>

      <section className="section">
        <h2>The guarantees</h2>
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

      <section className="section" style={{ maxWidth: "var(--width-prose)" }}>
        <h2>A package name is an import path</h2>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Names are dotted, two to four segments, each matching <code>[a-z][a-z0-9_]*</code>. The
          first segment is a scope owned by one account, which is what stops name squatting without
          inventing a sigil that dotted imports cannot express.
        </p>
        <div style={{ marginTop: "1rem" }}>
          <Snippet text={`import ${EXAMPLE_MODULE}`} label="import statement" />
        </div>
        <p className="muted small" style={{ marginTop: "0.75rem" }}>
          That resolves to{" "}
          <code>
            {PACKAGES_DIRECTORY}/{EXAMPLE_MODULE.split(SEGMENT_SEPARATOR).join("/")}
            {MODULE_EXTENSION}
          </code>{" "}
          — a real file at a real path, which is why go-to-definition into a dependency works with
          no extra plumbing.
        </p>
      </section>

      <section className="section" style={{ maxWidth: "var(--width-prose)" }}>
        <h2>The read path is just files</h2>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Index files and archives are static, written when a package is published or yanked and
          never generated per request. A registry is a directory, so the same client reads a local
          folder and a CDN with no change:
        </p>
        <div className="stack" style={{ marginTop: "1rem" }}>
          <Snippet
            text={`PETA_REGISTRY=${location.origin} ${CLIENT_NAME} install ${EXAMPLE_SIBLING}`}
            prompt="$"
            label="remote registry command"
          />
        </div>
        <p className="muted small" style={{ marginTop: "0.75rem" }}>
          The database records who published what and when; the index files are a build output
          regenerated from it. One writer, one source of truth.
        </p>
      </section>

      <section className="section" style={{ maxWidth: "var(--width-prose)" }}>
        <h2>Compatibility is measured, not promised</h2>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          There is no <code>engine</code> field and no <code>targets</code> field. An author cannot
          know which {LANGUAGE_NAME} releases or which backends accept their code — that depends on
          the compiler. So the hub compiles each release and records what worked. When a compiler
          release widens what is accepted, old packages improve without being republished.
        </p>
        <p className="muted small" style={{ marginTop: "0.75rem" }}>
          Those badges are not built yet. Package pages leave room for them.
        </p>
      </section>
    </div>
  );
}
