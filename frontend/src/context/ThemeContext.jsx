import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage first
    const savedTheme = localStorage.getItem('gymTheme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // Default to dark mode if no preference saved
    return true;
  });

  useEffect(() => {
    // Access the root HTML element
    const root = document.documentElement;
    if (isDarkMode) {
      root.removeAttribute('data-theme');
      localStorage.setItem('gymTheme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('gymTheme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
