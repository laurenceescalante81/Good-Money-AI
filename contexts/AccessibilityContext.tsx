import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@ozfin_accessibility';

type DisplaySize = 'default' | 'large' | 'extra-large';

interface AccessibilityState {
  displaySize: DisplaySize;
  fontScale: number;
  iconScale: number;
  spacingScale: number;
}

interface AccessibilityContextType extends AccessibilityState {
  setDisplaySize: (size: DisplaySize) => void;
  fs: (baseFontSize: number) => number;
  is: (baseIconSize: number) => number;
}

const SCALE_MAP: Record<DisplaySize, { fontScale: number; iconScale: number; spacingScale: number }> = {
  'default': { fontScale: 1.15, iconScale: 1.05, spacingScale: 1.0 },
  'large': { fontScale: 1.35, iconScale: 1.2, spacingScale: 1.1 },
  'extra-large': { fontScale: 1.55, iconScale: 1.35, spacingScale: 1.2 },
};

const AccessibilityContext = createContext<AccessibilityContextType>({
  displaySize: 'default',
  fontScale: 1.15,
  iconScale: 1.05,
  spacingScale: 1.0,
  setDisplaySize: () => {},
  fs: (s) => Math.round(s * 1.15),
  is: (s) => Math.round(s * 1.05),
});

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [displaySize, setDisplaySizeState] = useState<DisplaySize>('default');
  const scales = SCALE_MAP[displaySize];

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (parsed.displaySize && SCALE_MAP[parsed.displaySize as DisplaySize]) {
            setDisplaySizeState(parsed.displaySize as DisplaySize);
          }
        } catch {}
      }
    });
  }, []);

  const setDisplaySize = useCallback((size: DisplaySize) => {
    setDisplaySizeState(size);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ displaySize: size }));
  }, []);

  const fs = useCallback((base: number) => Math.round(base * scales.fontScale), [scales.fontScale]);
  const is = useCallback((base: number) => Math.round(base * scales.iconScale), [scales.iconScale]);

  return (
    <AccessibilityContext.Provider value={{
      displaySize,
      fontScale: scales.fontScale,
      iconScale: scales.iconScale,
      spacingScale: scales.spacingScale,
      setDisplaySize,
      fs,
      is,
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
