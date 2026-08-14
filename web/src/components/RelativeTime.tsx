import type { JSX } from "react";
import { formatExactDate, formatRelative } from "../lib/format";

type Props = {
  readonly iso: string;
};

export function RelativeTime({ iso }: Props): JSX.Element {
  return (
    <time dateTime={iso} title={formatExactDate(iso)}>
      {formatRelative(iso)}
    </time>
  );
}
