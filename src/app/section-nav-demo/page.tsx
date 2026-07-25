import SectionNavigation, {
  type Section,
} from "@/components/SectionNavigation/SectionNavigation";
import styles from "./demo.module.scss";

// The single source of truth. Add, remove, or reorder entries here and both the
// rail and the page follow — nothing downstream is positional.
//
// The only contract: every `id` must match the `id` of a rendered element.
const SECTIONS: Section[] = [
  { id: "overview", label: "Overview" },
  { id: "how-it-works", label: "How it works" },
  { id: "accessibility", label: "Accessibility" },
  { id: "performance", label: "Performance" },
  { id: "adoption", label: "Adoption" },
];

const COPY: Record<string, { eyebrow: string; heading: string; body: string }> =
  {
    overview: {
      eyebrow: "Overview",
      heading: "A rail that tells you where you are",
      body: "The indicator tracks the section under the middle of the viewport. Scroll the page and the active line grows and turns white; the rest stay short and grey.",
    },
    "how-it-works": {
      eyebrow: "How it works",
      heading: "One observer, no scroll handler",
      body: "The IntersectionObserver root is collapsed to a zero-height line across the viewport centre, so exactly one section intersects at a time. The browser does that work off the main thread, which is why the rail stays smooth during fast scrolling.",
    },
    accessibility: {
      eyebrow: "Accessibility",
      heading: "Reachable without a mouse",
      body: "Each indicator is a real anchor, so Tab reaches it and Enter follows it. The active one carries aria-current, focus travels with the scroll, and the labels stay in the DOM so the links always have an accessible name.",
    },
    performance: {
      eyebrow: "Performance",
      heading: "Transform, not layout",
      body: "Lines animate with scaleX rather than width, keeping the work on the compositor. Reduced-motion preferences collapse both the transition and the smooth scroll.",
    },
    adoption: {
      eyebrow: "Adoption",
      heading: "Add a section, add a line",
      body: "Append an entry to the sections array and render a matching element id. There is no registration step and no index to keep in sync.",
    },
  };

export default function SectionNavDemoPage() {
  return (
    <div className={styles.page}>
      <SectionNavigation sections={SECTIONS} ariaLabel="Page sections" />

      {SECTIONS.map(({ id }) => {
        const { eyebrow, heading, body } = COPY[id];

        return (
          <section key={id} id={id} className={styles.section}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h2 className={styles.heading}>{heading}</h2>
            <p className={styles.body}>{body}</p>
          </section>
        );
      })}
    </div>
  );
}
