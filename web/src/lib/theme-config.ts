export const THEME_STORAGE_KEY = "petahub.theme";
export const THEME_ATTRIBUTE = "data-theme";
export const THEMES = ["light", "dark", "system"] as const;

export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "system";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

export function bootScript(): string {
  return `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
if(t!=="light"&&t!=="dark"){t=matchMedia(${JSON.stringify(DARK_QUERY)}).matches?"dark":"light"}
document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},t)}catch(e){}})()`
    .split("\n")
    .join("");
}
