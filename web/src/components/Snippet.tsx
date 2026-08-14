import type { JSX } from "react";
import { useCopy } from "../hooks/useCopy";
import { Icon } from "./Icon";

type Props = {
  readonly text: string;
  readonly prompt?: string;
  readonly label: string;
};

export function Snippet({ text, prompt, label }: Props): JSX.Element {
  const { copied, copy } = useCopy();

  return (
    <div className="snippet">
      <code className="snippet__code">
        {prompt === undefined ? null : <span className="snippet__prompt">{prompt} </span>}
        {text}
      </code>
      <button
        type="button"
        className="btn snippet__copy"
        data-copied={copied}
        onClick={() => copy(text)}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        title={copied ? "Copied" : "Copy"}
      >
        <Icon name={copied ? "check" : "copy"} className="btn__icon" />
      </button>
    </div>
  );
}
