// HealthyEating — Design Tokens
// Apple Health-inspired, clean & minimal with green accent

export const brand = {
  primary: '#16A34A',
  primaryLight: '#22C55E',
  primaryBg: '#F0FDF4',
  primaryBorder: '#BBF7D0',
  primaryDark: '#14532D',
};

export const macros = {
  protein: '#3B82F6',
  carbs: '#F59E0B',
  fat: '#EF4444',
  fibre: '#16A34A',
  calories: '#8B5CF6',
};

export const ui = {
  cardBg: '#FFFFFF',
  screenBg: '#F9FAFB',
  inputBg: '#F9FAFB',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  shadow: '#000000',
};

export const text = {
  primary: '#111827',
  secondary: '#6B7280',
  tertiary: '#9CA3AF',
  inverse: '#FFFFFF',
  label: '#374151',
};

export default {
  light: {
    text: text.primary,
    textSecondary: text.secondary,
    background: ui.screenBg,
    tint: brand.primary,
    tabIconDefault: text.tertiary,
    tabIconSelected: brand.primary,
    card: ui.cardBg,
    border: ui.border,
  },
  dark: {
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    background: '#111827',
    tint: brand.primaryLight,
    tabIconDefault: '#6B7280',
    tabIconSelected: brand.primaryLight,
    card: '#1F2937',
    border: '#374151',
  },
};
