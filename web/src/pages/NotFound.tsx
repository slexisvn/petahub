import type { JSX, ReactNode } from "react";
import { Link } from "react-router";
import { EmptyState } from "../components/Feedback";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

type Props = {
  readonly title?: string;
  readonly children?: ReactNode;
};

export function NotFoundPage({ title = "Page not found", children }: Props): JSX.Element {
  useDocumentTitle(title);
  return (
    <div className="page">
      <EmptyState
        icon="search"
        title={title}
        action={
          <Link className="btn btn--primary" to="/search">
            Browse packages
          </Link>
        }
      >
        {children ?? <p>The address you followed does not match anything on this registry.</p>}
      </EmptyState>
    </div>
  );
}
