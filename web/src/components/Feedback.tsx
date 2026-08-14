import type { JSX, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

const NOTICE_ICONS = {
  warn: "alert",
  bad: "alert",
  good: "check",
  info: "info"
} satisfies Record<string, IconName>;

export type NoticeTone = keyof typeof NOTICE_ICONS;

type NoticeProps = {
  readonly tone: NoticeTone;
  readonly title: string;
  readonly children?: ReactNode;
};

export function Notice({ tone, title, children }: NoticeProps): JSX.Element {
  return (
    <div className={`notice notice--${tone}`} role={tone === "bad" ? "alert" : undefined}>
      <Icon name={NOTICE_ICONS[tone]} className="notice__icon" />
      <div>
        <p className="notice__title">{title}</p>
        {children === undefined ? null : <div className="notice__body">{children}</div>}
      </div>
    </div>
  );
}

type EmptyProps = {
  readonly icon: IconName;
  readonly title: string;
  readonly children?: ReactNode;
  readonly action?: ReactNode;
};

export function EmptyState({ icon, title, children, action }: EmptyProps): JSX.Element {
  return (
    <div className="empty">
      <Icon name={icon} className="empty__icon" />
      <p className="empty__title">{title}</p>
      {children === undefined ? null : <div className="empty__body">{children}</div>}
      {action === undefined ? null : <div className="empty__action">{action}</div>}
    </div>
  );
}

type SkeletonProps = {
  readonly width?: string;
  readonly height?: string;
};

export function Skeleton({ width = "100%", height = "1rem" }: SkeletonProps): JSX.Element {
  return <span className="skeleton" style={{ width, height, display: "block" }} />;
}

export function SkeletonList({ rows }: { readonly rows: number }): JSX.Element {
  return (
    <div className="hit-list" aria-busy="true" aria-label="Loading packages">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="hit">
          <div className="hit__head">
            <Skeleton width="12rem" height="1.1rem" />
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <Skeleton width="70%" height="0.85rem" />
          </div>
        </div>
      ))}
    </div>
  );
}
