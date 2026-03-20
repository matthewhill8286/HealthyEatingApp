/**
 * useTheme — provides resolved colors based on the current color scheme.
 *
 * Returns a `colors` object that maps semantic keys to actual hex values,
 * switching between light and dark palettes automatically.
 *
 * Usage:
 *   const { colors, isDark } = useTheme();
 *   <View style={{ backgroundColor: colors.screenBg }} />
 */
import { useMemo } from 'react';
import { useColorScheme } from '@/components/useColorScheme';
import { brand, macros } from '@/constants/Colors';

const lightPalette = {
  // Backgrounds
  screenBg: '#F9FAFB',
  cardBg: '#FFFFFF',
  inputBg: '#F9FAFB',
  elevatedBg: '#FFFFFF',

  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  textLabel: '#374151',

  // Brand
  ...brand,

  // Macros
  macroProtein: macros.protein,
  macroCarbs: macros.carbs,
  macroFat: macros.fat,
  macroFibre: macros.fibre,
  macroCalories: macros.calories,

  // Tab bar
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#F0F0F0',
  tabBarActive: brand.primary,
  tabBarInactive: '#9CA3AF',

  // Components
  skeletonBg: '#E5E7EB',
  skeletonHighlight: '#F3F4F6',
  pillBg: '#FFFFFF',
  pillBorder: '#F3F4F6',
  pillTodayBg: brand.primaryBg,
  pillTodayBorder: brand.primaryBorder,
  trackBg: '#F3F4F6',
  shadow: '#000000',
  shadowOpacity: 0.04,

  // AI
  aiBg: '#F3E8FF',
  aiAccent: '#A78BFA',

  // Status
  destructive: '#EF4444',
  destructiveBg: '#FEF2F2',
  successBg: '#F0FDF4',
};

const darkPalette: typeof lightPalette = {
  // Backgrounds
  screenBg: '#111827',
  cardBg: '#1F2937',
  inputBg: '#1F2937',
  elevatedBg: '#374151',

  // Borders
  border: '#374151',
  borderLight: '#1F2937',

  // Text
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  textInverse: '#111827',
  textLabel: '#D1D5DB',

  // Brand
  primary: '#22C55E',
  primaryLight: '#4ADE80',
  primaryBg: '#14532D',
  primaryBorder: '#166534',
  primaryDark: '#BBF7D0',

  // Macros
  macroProtein: '#60A5FA',
  macroCarbs: '#FBBF24',
  macroFat: '#F87171',
  macroFibre: '#4ADE80',
  macroCalories: '#A78BFA',

  // Tab bar
  tabBarBg: '#1F2937',
  tabBarBorder: '#374151',
  tabBarActive: '#22C55E',
  tabBarInactive: '#6B7280',

  // Components
  skeletonBg: '#374151',
  skeletonHighlight: '#4B5563',
  pillBg: '#1F2937',
  pillBorder: '#374151',
  pillTodayBg: '#14532D',
  pillTodayBorder: '#166534',
  trackBg: '#374151',
  shadow: '#000000',
  shadowOpacity: 0.2,

  // AI
  aiBg: '#2E1065',
  aiAccent: '#A78BFA',

  // Status
  destructive: '#F87171',
  destructiveBg: '#450A0A',
  successBg: '#14532D',
};

export type ThemeColors = typeof lightPalette;

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const colors = useMemo<ThemeColors>(
    () => (isDark ? darkPalette : lightPalette),
    [isDark]
  );

  return { colors, isDark };
}
