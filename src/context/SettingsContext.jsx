'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'tarseekh_settings_v1';
const LEGACY_STORAGE_KEY = 'tadabbur_settings_v1';

const defaultSettings = {
  theme: 'light',
  reading_view: 'ayat', // 'ayat' | 'halaman'
  mushaf_font: 'kfgqpc-v4', // 'kfgqpc-v4' (KFGQPC 1441H Print from QUL) | 'amiri'
  text_align: 'center', // 'center' (Rata Tengah) | 'justify' (Rata Kanan-Kiri)
  font_scale: 1.75, // in rem (maps to CSS var --quran-scale)
  show_translation: false, // Default false per PRD FR-1
  show_tajwid: false,
  daily_goal_ayah: 5,
  timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Jakarta',
};

const SettingsContext = createContext({
  settings: defaultSettings,
  updateSettings: () => {},
  toggleTheme: () => {},
  isLoaded: false,
});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } else {
        // System preference for theme if not saved
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setSettings((prev) => ({ ...prev, theme: prefersDark ? 'dark' : 'light' }));
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Sync theme class & font-scale CSS variable with document
  useEffect(() => {
    if (!isLoaded) return;

    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.style.setProperty('--quran-scale', `${settings.font_scale}rem`);
  }, [settings.theme, settings.font_scale, isLoaded]);

  // Persist to localStorage
  const updateSettings = (partial) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save settings to localStorage', e);
      }
      return updated;
    });
  };

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, toggleTheme, isLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
