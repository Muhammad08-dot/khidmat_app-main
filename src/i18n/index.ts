/**
 * Minimal i18n layer for English/Urdu.
 *
 * Device locale decides the default (expo-localization); the user can force
 * a language which is persisted in AsyncStorage. RTL is toggled alongside the
 * language — `I18nManager.forceRTL` requires an app restart to take effect on
 * native, so the UI degrades gracefully (strings switch immediately, layout
 * mirrors after reload).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import ur from './ur.json';
import { isRTL, syncDirection, SupportedLang } from './direction';

export type Lang = SupportedLang;
export { isRTL, syncDirection };

const DICTS: Record<Lang, Record<string, string>> = { en, ur };
const STORAGE_KEY = 'khidmat.lang';

let currentLang: Lang = 'en';

export const getLang = (): Lang => currentLang;

export function setLang(lang: Lang): void {
  currentLang = lang;
  syncDirection(lang);
  AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
}

/** Restore the persisted language on app start. */
export async function initI18n(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'ur') {
      currentLang = stored;
      syncDirection(stored);
    } else {
      syncDirection('en');
    }
  } catch {
    syncDirection('en');
  }
}

export function t(key: string): string {
  return DICTS[currentLang][key] ?? DICTS.en[key] ?? key;
}
