import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type FontScalePreset = 'small' | 'normal' | 'large';

const THEME_KEY = 'khidmat.pref.theme';
const FONT_KEY = 'khidmat.pref.fontScale';

const FONT_MULTIPLIERS: Record<FontScalePreset, number> = {
  small: 0.9,
  normal: 1.0,
  large: 1.15,
};

interface PreferencesContextValue {
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  fontPreset: FontScalePreset;
  fontMultiplier: number;
  setFontPreset: (preset: FontScalePreset) => void;
  scaled: (baseSize: number) => number;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  themeMode: 'light',
  resolvedTheme: 'light',
  isDark: false,
  setThemeMode: () => {},
  fontPreset: 'normal',
  fontMultiplier: 1.0,
  setFontPreset: () => {},
  scaled: (s) => s,
});

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [fontPreset, setFontPresetState] = useState<FontScalePreset>('normal');

  useEffect(() => {
    void (async () => {
      try {
        const [savedTheme, savedFont] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(FONT_KEY),
        ]);
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          setThemeModeState(savedTheme);
        }
        if (savedFont === 'small' || savedFont === 'normal' || savedFont === 'large') {
          setFontPresetState(savedFont);
        }
      } catch {
        // Ignore storage read errors in test/private contexts
      }
    })();
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_KEY, mode).catch(() => {});
  };

  const setFontPreset = (preset: FontScalePreset) => {
    setFontPresetState(preset);
    AsyncStorage.setItem(FONT_KEY, preset).catch(() => {});
  };

  const resolvedTheme: 'light' | 'dark' =
    themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;
  const isDark = resolvedTheme === 'dark';
  const fontMultiplier = FONT_MULTIPLIERS[fontPreset];
  const scaled = (baseSize: number) => Math.round(baseSize * fontMultiplier);

  return (
    <PreferencesContext.Provider
      value={{
        themeMode,
        resolvedTheme,
        isDark,
        setThemeMode,
        fontPreset,
        fontMultiplier,
        setFontPreset,
        scaled,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);

