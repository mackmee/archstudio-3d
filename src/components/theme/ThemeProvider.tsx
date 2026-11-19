'use client';

import React, { useEffect } from 'react';
import { usePreferencesStore } from '@/store/usePreferencesStore';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, hasHydrated } = usePreferencesStore();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('dark', 'light');
      root.classList.add(theme);
    }
  }, [theme]);

  // When not yet hydrated on client, render children directly without flash
  return <div className={`h-full w-full flex flex-col ${hasHydrated ? theme : 'dark'}`}>{children}</div>;
};
