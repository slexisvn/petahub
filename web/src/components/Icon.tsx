import type { JSX, ReactNode } from "react";

const ICONS = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  box: (
    <>
      <path d="M21 8.5v7a2 2 0 0 1-1 1.7l-7 3.9a2 2 0 0 1-2 0l-7-3.9a2 2 0 0 1-1-1.7v-7a2 2 0 0 1 1-1.7l7-3.9a2 2 0 0 1 2 0l7 3.9a2 2 0 0 1 1 1.7z" />
      <path d="m3.3 7.4 8.7 4.8 8.7-4.8M12 21v-8.8" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-3.6 8-9.6V5.6L12 2.5 4 5.6v6.8C4 18.4 12 22 12 22z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10.5" width="16" height="10.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </>
  ),
  layers: <path d="m12 2.5 9 4.8-9 4.8-9-4.8zM3 12.2l9 4.8 9-4.8M3 17l9 4.8 9-4.8" />,
  code: <path d="m8.5 7.5-5 4.5 5 4.5M15.5 7.5l5 4.5-5 4.5M13.5 4l-3 16" />,
  alert: (
    <>
      <path d="M12 3.2 1.8 20.4h20.4z" />
      <path d="M12 9.5v4.5M12 17.5h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4.5M12 8h.01" />
    </>
  ),
  external: <path d="M14 4h6v6M20 4l-9 9M18 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5" />,
  download: <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M3.5 18.5V20a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-1.5" />,
  github: (
    <path
      d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-1-2.6c3.1-.3 6.4-1.5 6.4-7A5.4 5.4 0 0 0 20 4.8a5 5 0 0 0-.1-3.7s-1.2-.3-3.9 1.5a13.4 13.4 0 0 0-7 0C6.3 1.2 5.1 1.1 5.1 1.1a5 5 0 0 0-.1 3.7 5.4 5.4 0 0 0-1.4 3.7c0 5.5 3.3 6.7 6.4 7a3.4 3.4 0 0 0-1 2.6V22"
      transform="translate(0 1)"
    />
  ),
  chevron: <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  inbox: (
    <>
      <path d="M21 12.5h-5l-1.5 3h-5l-1.5-3H3" />
      <path d="M6.2 4.5h11.6a2 2 0 0 1 1.8 1.2l2.2 5.4a2 2 0 0 1 .2.8v6.6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6.6a2 2 0 0 1 .2-.8l2.2-5.4a2 2 0 0 1 1.8-1.2z" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="16.5" r="3.5" />
      <path d="m10 14 9-9M16.5 7.5l2.5 2.5M14 10l2.5 2.5" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 11.4V4.5a1 1 0 0 1 1-1h6.9a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8l-6.9 6.9a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4z" />
      <path d="M7.5 7.5h.01" />
    </>
  ),
  trash: <path d="M4 6.5h16M9.5 6.5V4.8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.7M6.5 6.5 7.4 20a1 1 0 0 0 1 1h7.2a1 1 0 0 0 1-1l.9-13.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.8V12l3.4 2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  )
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

type Props = {
  readonly name: IconName;
  readonly className?: string;
};

export function Icon({ name, className }: Props): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}
