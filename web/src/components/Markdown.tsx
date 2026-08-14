import type { JSX } from "react";
import { useMemo } from "react";
import { renderMarkdown } from "../lib/markdown";

type Props = {
  readonly source: string;
};

export function Markdown({ source }: Props): JSX.Element {
  const html = useMemo(() => renderMarkdown(source), [source]);
  return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
