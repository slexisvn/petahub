import type { JSX } from "react";
import { SEGMENT_SEPARATOR } from "@slexisvn/peta/browser";

type Props = {
  readonly name: string;
  readonly className?: string;
};

export function PackageName({ name, className }: Props): JSX.Element {
  const cut = name.indexOf(SEGMENT_SEPARATOR);
  const classes = className === undefined ? "pkg-name" : `pkg-name ${className}`;
  if (cut === -1) return <span className={classes}>{name}</span>;
  return (
    <span className={classes}>
      <span className="pkg-name__scope">{name.slice(0, cut)}</span>
      <span className="pkg-name__dot">{SEGMENT_SEPARATOR}</span>
      {name.slice(cut + SEGMENT_SEPARATOR.length)}
    </span>
  );
}
