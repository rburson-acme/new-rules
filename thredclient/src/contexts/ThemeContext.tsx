import React, { createContext, ReactNode, useContext, useState } from 'react';
import { ThemeStore } from '../stores/ThemeStore';
import { DEFAULT_THEME } from '../constants/DefaultTheme';

// DEFAULT THEME

// Create a context
const ThemeContext = createContext(DEFAULT_THEME);

type ThemeProviderProps = {
  children: ReactNode;
  themeStore: ThemeStore;
};

export const ThemeProvider = ({ children, themeStore }: ThemeProviderProps) => {
  return <ThemeContext.Provider value={themeStore.theme}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
