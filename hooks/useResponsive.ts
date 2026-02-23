import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface ResponsiveInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  contentWidth: number;
  chartWidth: number;
  sidePadding: number;
  columns: number;
}

const TABLET_BP = 768;
const DESKTOP_BP = 1024;

export function useResponsive(): ResponsiveInfo {
  const [dims, setDims] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDims(window));
    return () => sub?.remove();
  }, []);

  const { width, height } = dims;

  const breakpoint: Breakpoint =
    width >= DESKTOP_BP ? 'desktop' :
    width >= TABLET_BP ? 'tablet' : 'mobile';

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';

  const sidebarWidth = isDesktop ? 220 : 0;
  const availableWidth = width - sidebarWidth;

  const contentWidth = isDesktop
    ? Math.min(availableWidth - 80, 960)
    : isTablet
    ? Math.min(width - 48, 720)
    : width;

  const chartWidth = isDesktop
    ? Math.min(availableWidth - 120, 880)
    : isTablet
    ? Math.min(width - 64, 680)
    : Math.min(width - 40, 500);

  const sidePadding = isDesktop ? 40 : isTablet ? 24 : 20;

  const columns = isDesktop ? 3 : isTablet ? 2 : 1;

  return {
    width,
    height,
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    contentWidth,
    chartWidth,
    sidePadding,
    columns,
  };
}
