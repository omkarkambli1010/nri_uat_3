"use client";

import styles from "./SectionNavigation.module.scss";
import { useActiveSection, type Section } from "./useActiveSection";

export type { Section };

export interface SectionNavigationProps {
  sections: Section[];
  /**
   * The tone of the background the rail sits on — not the OS theme.
   * `onDark` (default) draws white marks; `onLight` draws dark ones.
   */
  tone?: "onDark" | "onLight";
  /** Extra class on the <nav>, for positioning overrides. */
  className?: string;
  /** Accessible name for the landmark. */
  ariaLabel?: string;
  /** Playhead position: 0 = viewport top, 1 = viewport bottom. */
  anchor?: number;
}

/**
 * Fixed right-rail section indicator.
 *
 * One line per section: short and grey when inactive, long and white when
 * active, with the label revealed on hover or keyboard focus. Adding a section
 * means adding an entry to `sections` — nothing here is positional or hard-coded.
 */
export default function SectionNavigation({
  sections,
  tone = "onDark",
  className,
  ariaLabel = "Page sections",
  anchor = 0.5,
}: SectionNavigationProps) {
  const { activeId, scrollToSection } = useActiveSection(sections, anchor);

  if (sections.length === 0) return null;

  const navClass = [styles.nav, tone === "onLight" && styles.onLight, className]
    .filter(Boolean)
    .join(" ");

  return (
    <nav className={navClass} aria-label={ariaLabel}>
      <ul className={styles.list}>
        {sections.map(({ id, label }) => {
          const isActive = id === activeId;

          return (
            <li key={id} className={styles.item}>
              <a
                href={`#${id}`}
                className={
                  isActive ? `${styles.link} ${styles.linkActive}` : styles.link
                }
                aria-current={isActive ? "true" : undefined}
                onClick={(event) => {
                  // Let modified clicks (new tab, etc.) behave natively.
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  ) {
                    return;
                  }
                  event.preventDefault();
                  scrollToSection(id);
                }}
              >
                {/* Always in the DOM so the link has an accessible name;
                    only its opacity changes. */}
                <span className={styles.label}>{label}</span>
                <span className={styles.line} aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
