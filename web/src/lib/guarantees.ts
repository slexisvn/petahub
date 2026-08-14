import type { IconName } from "../components/Icon";

export type Guarantee = {
  readonly icon: IconName;
  readonly title: string;
  readonly body: string;
};

export const GUARANTEES: readonly Guarantee[] = [
  {
    icon: "code",
    title: "Tera source only",
    body: "No JavaScript, no C, no wasm, no build step. An extension whitelist is enforced when packing, publishing and unpacking."
  },
  {
    icon: "shield",
    title: "Nothing runs at install",
    body: "There are no install scripts, of any kind. Installing a package is fetch, verify, copy — never execute."
  },
  {
    icon: "layers",
    title: "One version per name",
    body: "Tera's module identity keys on the import path, so a name resolves to exactly one version. There is no nested tree."
  },
  {
    icon: "lock",
    title: "Releases are immutable",
    body: "Yank makes a version unselectable for new resolutions and deletes nothing. A lockfile that resolved it keeps working."
  }
];

export const PLANNED_COMPATIBILITY = [
  "interp",
  "jit",
  "aot",
  "tera range"
] as const;
