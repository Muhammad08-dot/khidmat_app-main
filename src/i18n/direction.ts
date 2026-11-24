import { I18nManager, TextStyle, ViewStyle } from 'react-native';

export type SupportedLang = 'en' | 'ur';

/**
 * Single source of truth for RTL support in Khidmat.
 * Only Urdu ('ur') is an RTL language.
 */
export function isRTL(lang?: string | null): boolean {
  return lang === 'ur';
}

/**
 * Sync React Native's I18nManager with the desired language.
 */
export function syncDirection(lang: string | null | undefined): boolean {
  const rtl = isRTL(lang);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  try {
    (I18nManager as any).isRTL = rtl;
  } catch {}
  return rtl;
}

/**
 * Get the logical text alignment based on language direction.
 */
export function getLogicalTextAlign(rtl: boolean): 'left' | 'right' {
  return rtl ? 'right' : 'left';
}

/**
 * Strict LTR isolation styles for phone numbers (+92 prefix and digits).
 * Ensures phone numbers never invert to '92+' under RTL layouts.
 */
export const PHONE_CONTAINER_STYLE: ViewStyle = {
  flexDirection: 'row',
  direction: 'ltr',
};

export const PHONE_TEXT_STYLE: TextStyle = {
  writingDirection: 'ltr',
  textAlign: 'left',
};
