// template.tsx — re-mounts on every route change (unlike layout.tsx, which
// persists). Next.js replays this subtree's mount on each navigation, which is
// exactly what we need to drive a CSS entry animation for page transitions.
//
// Why a server component (no "use client"): the animation is pure CSS, so we
// keep SSR intact — content is still rendered server-side for SEO and there is
// no client JS cost or hydration delay for the transition.
import styles from "./template.module.scss";

export default function Template({ children }: { children: React.ReactNode }) {
  return <div className={styles.pageTransition}>{children}</div>;
}
