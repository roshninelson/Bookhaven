import React, { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = [
  {
    id: 'classic-light',
    name: 'Classic Light',
    accent: '#254f3b',
    bg: '#f8f6f0',
    card: '#ffffff',
    description: 'Editorial bookstore with warm ivory & forest green',
  },
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    accent: '#3d7256',
    bg: '#0f1115',
    card: '#181b22',
    description: 'Charcoal surfaces & comfortable night contrast',
  },
  {
    id: 'pink',
    name: 'Pink',
    accent: '#c44d6c',
    bg: '#fcf2f4',
    card: '#ffffff',
    description: 'Soft blush with refined rose elegance',
  },
  {
    id: 'black-gold',
    name: 'Black & Gold',
    accent: '#d4af37',
    bg: '#0b0b0d',
    card: '#151518',
    description: 'Luxury deep black with gilded gold accents',
  },
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    accent: '#8b5cf6',
    bg: '#0e0a1a',
    card: '#1a1330',
    description: 'Atmospheric deep violet & lavender highlights',
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    accent: '#2563eb',
    bg: '#0b1424',
    card: '#132238',
    description: 'Deep maritime navy with crisp blue & teal',
  },
];

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('bh_theme');
      if (saved && THEMES.some(t => t.id === saved)) {
        return saved;
      }
    } catch {
      // localStorage may fail in restricted mode
    }
    return 'classic-light';
  });

  const setTheme = (themeId) => {
    if (!THEMES.some(t => t.id === themeId)) return;
    setThemeState(themeId);
    try {
      localStorage.setItem('bh_theme', themeId);
    } catch {
      // ignore storage errors
    }
    document.documentElement.setAttribute('data-theme', themeId);
  };

  useEffect(() => {
    // Apply theme on root html element immediately
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
