'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';
export type Language = 'uz' | 'ru';
export type Currency = 'UZS' | 'USD';

export interface PreferencesState {
  theme: ThemeMode;
  language: Language;
  currency: Currency;
  usdToUzsRate: number;
  hasHydrated: boolean;

  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (lang: Language) => void;
  setCurrency: (currency: Currency) => void;
  setUsdToUzsRate: (rate: number) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'uz',
      currency: 'UZS',
      usdToUzsRate: 12800,
      hasHydrated: false,

      toggleTheme: () =>
        set((state) => {
          const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
          if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('dark', 'light');
            document.documentElement.classList.add(nextTheme);
          }
          return { theme: nextTheme };
        }),

      setTheme: (theme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('dark', 'light');
          document.documentElement.classList.add(theme);
        }
        set({ theme });
      },

      setLanguage: (language) => set({ language }),

      setCurrency: (currency) => set({ currency }),

      setUsdToUzsRate: (usdToUzsRate) => set({ usdToUzsRate: Math.max(1, usdToUzsRate) }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'archstudio_preferences',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
          if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('dark', 'light');
            document.documentElement.classList.add(state.theme);
          }
        }
      },
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        currency: state.currency,
        usdToUzsRate: state.usdToUzsRate,
      }),
    }
  )
);
