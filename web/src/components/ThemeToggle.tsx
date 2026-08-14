import type { JSX } from "react";
import { Icon } from "./Icon";
import { useTheme } from "../lib/theme";

export function ThemeToggle(): JSX.Element {
  const { resolved, setTheme } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="btn btn--ghost btn--icon"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      <Icon name="sun" className="btn__icon theme-toggle__icon--light" />
      <Icon name="moon" className="btn__icon theme-toggle__icon--dark" />
    </button>
  );
}
