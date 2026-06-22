import type { ReactNode } from "react";
import { liveRegionProps } from "@/lib/client/liveRegion";
import styles from "./EmptyState.module.css";

type EmptyStateVariant = "card" | "inline" | "panel";

type EmptyStateProps = {
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: string;
  live?: "alert" | "off" | "status";
  title?: string;
  variant?: EmptyStateVariant;
};

const variantClass: Record<EmptyStateVariant, string> = {
  card: styles.card,
  inline: styles.inline,
  panel: styles.panel,
};

export function EmptyState({
  action,
  children,
  className,
  description,
  eyebrow,
  live = "off",
  title,
  variant = "card",
}: EmptyStateProps) {
  const Tag = variant === "panel" ? "section" : variant === "inline" ? "p" : "div";
  const liveProps = live === "off" ? {} : liveRegionProps(live);

  const titleClass = variant === "panel" ? styles.panelTitle : styles.title;
  const TitleTag = variant === "panel" ? "h1" : "strong";

  return (
    <Tag
      className={[styles.root, variantClass[variant], className].filter(Boolean).join(" ")}
      {...liveProps}
    >
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      {title ? <TitleTag className={titleClass}>{title}</TitleTag> : null}
      {description ? <p className={styles.description}>{description}</p> : null}
      {children}
      {action ? <div className={styles.actions}>{action}</div> : null}
    </Tag>
  );
}
