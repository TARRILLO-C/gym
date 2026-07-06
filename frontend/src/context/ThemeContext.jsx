import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('gymTheme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return true;
  });

  const [accentTheme, setAccentTheme] = useState(() => {
    return localStorage.getItem('gymAccentTheme') || 'red';
  });

  const accents = {
    red: { primary: '#ff3e3e', secondary: '#ff8a00' },
    lime: { primary: '#39ff14', secondary: '#00ff87' },
    pink: { primary: '#ff007f', secondary: '#7f00ff' },
    cyan: { primary: '#00f3ff', secondary: '#0078ff' },
    yellow: { primary: '#ffd700', secondary: '#ff8a00' }
  };

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.removeAttribute('data-theme');
      localStorage.setItem('gymTheme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('gymTheme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const root = document.documentElement;
    const currentAccent = accents[accentTheme] || accents.red;
    root.style.setProperty('--accent-primary', currentAccent.primary);
    root.style.setProperty('--accent-secondary', currentAccent.secondary);
    localStorage.setItem('gymAccentTheme', accentTheme);
  }, [accentTheme]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, accentTheme, setAccentTheme, accents }}>
      {children}
    </ThemeContext.Provider>
  );
};
