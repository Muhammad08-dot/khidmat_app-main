/**
 * Canonical brand palette.
 *
 * These hex values are the single source of truth for the Khidmat brand and MUST
 * stay in sync with the `theme.extend.colors` tokens in `tailwind.config.js`.
 *
 * Why this exists: Tailwind classes (`bg-primary`, `text-primary`, `border-primary`)
 * already read from the token, but imperative props — lucide `<Icon color=... />`,
 * `ActivityIndicator color=...`, `RefreshControl tintColor=...`, inline
 * `style={{ color }}` — need a concrete string. Those used to scatter raw hex
 * (`#1F5D3F`, `#059669`, `#EF4444`, `#F59E0B`, ...) across the app; import `BRAND`
 * here instead so a rebrand is a one-line change.
 *
 * Semantic tokens (`success/danger/warning/info/caution/muted`) are colour-
 * preserving: each value equals the hex that was previously hardcoded, so
 * migrating to them is a consistency win with zero visual change.
 */
export const BRAND = {
  /** Tailwind token: `primary` */
  primary: "#1F5D3F",
  /** Tailwind token: `primary-hover` */
  primaryHover: "#17452F",
  /** Tailwind token: `ink` */
  ink: "#14231C",
  /** Tailwind token: `surface` */
  surface: "#FBFAF6",
  /** Tailwind token: `surface-raised` */
  surfaceRaised: "#FFFFFF",
  /** Tailwind token: `border` */
  border: "#E4E2D8",
  /** Tailwind token: `accent` / `accent-gold` */
  gold: "#B8863B",
  /** Tailwind token: `accent-terracotta` */
  terracotta: "#C1613F",
  /** Success / verified / positive. */
  success: "#059669",
  /** Destructive / delete / cancelled. */
  danger: "#EF4444",
  /** In-progress / attention (amber). */
  warning: "#F59E0B",
  /** Neutral info / offline / closed (slate). */
  muted: "#64748B",
  /** Pending / secondary caution (deep orange). */
  caution: "#C2410C",
  /** Informational blue. */
  info: "#4A7FA0",
} as const;

export type BrandColor = keyof typeof BRAND;
