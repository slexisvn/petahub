import type { JSX } from "react";
import { useEffect, useRef } from "react";
import { Icon } from "./Icon";

const FOCUS_KEY = "/";

type Props = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly large?: boolean;
  readonly autoFocus?: boolean;
  readonly label: string;
};

export function SearchBox({
  value,
  onChange,
  placeholder,
  large = false,
  autoFocus = false,
  label
}: Props): JSX.Element {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key !== FOCUS_KEY || event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      input.current?.focus();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <div className={large ? "search search--large" : "search"}>
      <Icon name="search" className="search__icon" />
      <input
        ref={input}
        type="search"
        className="search__input"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onChange("");
            event.currentTarget.blur();
          }
        }}
      />
      <kbd className="search__hint">{FOCUS_KEY}</kbd>
    </div>
  );
}
