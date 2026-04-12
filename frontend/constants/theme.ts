// ─── Color Palette ──────────────────────────────────────────────────────────
export const colors = {
  // Primary: Blue family
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: 'rgba(59, 130, 246, 0.25)',

  // Secondary: Purple family
  secondary: '#A78BFA',
  secondaryLight: 'rgba(167, 139, 250, 0.25)',

  // Alert: Red family
  alert: '#EF4444',
  alertLight: 'rgba(239, 68, 68, 0.25)',

  // Neutrals
  background: '#1A202C',
  surface: 'rgba(255, 255, 255, 0.15)',
  border: 'rgba(255, 255, 255, 0.2)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.75)',
  muted: 'rgba(255, 255, 255, 0.5)',

  // Accent
  success: '#22C55E',
  successLight: 'rgba(34, 197, 94, 0.25)',

  // Tab bar
  tabActive: '#3B82F6',
};

// ─── Typography ──────────────────────────────────────────────────────────────
export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

// ─── Border Radius ────────────────────────────────────────────────────────────
export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

// ─── Shadows ─────────────────────────────────────────────────────────────────
export const shadows = {
  sm: { elevation: 0, shadowOpacity: 0 },
  md: { elevation: 0, shadowOpacity: 0 },
};
