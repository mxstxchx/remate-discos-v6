"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
// Define interfaces here since type declarations may be missing
import { type ThemeProviderProps as NextThemeProviderProps } from 'next-themes'; 

interface ThemeProviderProps extends Omit<NextThemeProviderProps, 'attribute'> {
  children: React.ReactNode;
  attribute?: 'class' | 'data-theme';
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
  themes?: string[];
  forcedTheme?: string;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
