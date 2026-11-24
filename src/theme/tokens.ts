/**
 * Khidmat Design Tokens (PRD Phase 2: P2-1)
 *
 * Single source of truth for design tokens:
 * - Colors (semantic, AA-compliant contrast)
 * - Typography (Scale, line-heights for Urdu Nastaliq >= 1.8x)
 * - Spacing (4-pt grid)
 * - Radii (12 inputs/buttons, 16 cards, full)
 * - Elevation / Shadows
 * - Motion / Transitions
 */

export const colors = {
  // Brand Greens
  primary: '#1F5D3F', // Brand green (contrast >= 4.5:1 on white)
  primaryDark: '#17452F',
  primarySoft: '#E8F5EE', // Subtle green tint for chips/active states
  primaryHover: '#164E33',

  // Neutrals / Surfaces
  background: '#FAFAF8', // Crisp near-white background
  surface: '#FFFFFF', // Clean elevated surface
  surfaceRaised: '#FFFFFF',
  border: '#E5E7EB', // Subtle light gray border
  borderSubtle: '#F3F4F6',

  // Typography
  text: '#111827', // Slate 900 primary text
  textMuted: '#6B7280', // Slate 500 secondary text
  textInverse: '#FFFFFF',

  // Accents
  accentGold: '#B8863B',
  accentTerracotta: '#C1613F',

  // Feedback & Status
  success: '#059669', // Emerald 600
  successSoft: '#ECFDF5',
  warning: '#D97706', // Amber 600
  warningSoft: '#FFFBEB',
  danger: '#DC2626', // Red 600
  dangerSoft: '#FEF2F2',
  info: '#2563EB', // Blue 600
  infoSoft: '#EFF6FF',

  // Dark Theme Tokens (Phase 2 stretch)
  dark: {
    background: '#0F1712',
    surface: '#17211B',
    border: '#263229',
    text: '#F4F2EA',
    textMuted: '#94A3B8',
    primary: '#4FA97B',
    primarySoft: '#1A3828',
  },
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12, // Inputs, buttons (PRD spec: 12)
  lg: 16, // Cards (PRD spec: 16)
  xl: 24,
  full: 9999, // Chips, avatars, pills
} as const;

export const typography = {
  // Font sizes
  display: 28,
  h1: 24,
  h2: 20,
  h3: 17,
  body: 15,
  caption: 13,
  tiny: 11,

  // Urdu line-height multipliers (PRD spec: >= 1.8x to prevent Nastaliq clipping)
  urduLineHeightMultiplier: 1.85,
  defaultLineHeightMultiplier: 1.35,

  // Font family names (mapped to loaded assets in fonts.ts)
  fonts: {
    display: 'Outfit_700Bold',
    displayMedium: 'Outfit_500Medium',
    sans: 'PlusJakartaSans_400Regular',
    sansMedium: 'PlusJakartaSans_500Medium',
    sansSemiBold: 'PlusJakartaSans_600SemiBold',
    sansBold: 'PlusJakartaSans_700Bold',
    urdu: 'NotoNastaliqUrdu_400Regular',
    urduBold: 'NotoNastaliqUrdu_700Bold',
  },
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

export const motion = {
  durationFast: 150,
  durationNormal: 220,
  durationSlow: 350,
  easingEaseOut: 'ease-out',
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Typography = typeof typography;
