/**
 * Minimal i18n layer for English/Urdu.
 *
 * Device locale decides the default (expo-localization); the user can force
 * a language which is persisted in AsyncStorage. RTL is toggled alongside the
 * language — `I18nManager.forceRTL` requires an app restart to take effect on
 * native, so the UI degrades gracefully (strings switch immediately, layout
 * mirrors after reload).
 */
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import en from './en.json';
import ur from './ur.json';

export type Lang = 'en' | 'ur';

const DICTS: Record<Lang, Record<string, string>> = { en, ur };
const STORAGE_KEY = 'khidmat.lang';

let currentLang: Lang = 'en';

export const getLang = (): Lang => currentLang;

export function setLang(lang: Lang): void {
  currentLang = lang;
  const wantsRTL = lang === 'ur';
  if (I18nManager.isRTL !== wantsRTL) {
    I18nManager.allowRTL(wantsRTL);
    I18nManager.forceRTL(wantsRTL);
  }
  AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
}

/** Restore the persisted language on app start. */
export async function initI18n(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'ur') {
      currentLang = stored;
      const wantsRTL = stored === 'ur';
      if (I18nManager.isRTL !== wantsRTL) {
        I18nManager.allowRTL(wantsRTL);
        I18nManager.forceRTL(wantsRTL);
      }
    } else {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    }
  } catch {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  }
}

export function t(key: string): string {
  return DICTS[currentLang][key] ?? DICTS.en[key] ?? key;
}
