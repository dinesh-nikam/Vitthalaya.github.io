/**
 * src/theme.ts
 *
 * Design token exports – generated from the Tailwind utility audit.
 * Import these constants to keep styling consistent across the app.
 */

export const SPACING = {
  // Tailwind spacing scale (p-*) mapped to rem values
  '0': '0rem',
  '0.5': '0.125rem',
  '1': '0.25rem',
  '1.5': '0.375rem',
  '2': '0.5rem',
  '2.5': '0.625rem',
  '3': '0.75rem',
  '3.5': '0.9375rem',
  '4': '1rem',
  '5': '1.25rem',
  '6': '1.5rem',
  '7': '1.75rem',
  '8': '2rem',
  '12': '3rem',
  '16': '4rem',
  '20': '5rem',
  '24': '6rem',
  '28': '7rem',
  '32': '8rem',
  '36': '9rem',
  '40': '10rem',
  '44': '11rem',
  '48': '12rem',
  '52': '13rem',
  '60': '15rem',
  '64': '16rem',
  '72': '18rem',
  '80': '20rem',
  '96': '24rem',
};

export const COLOR = {
  primary: '#FF7A1A',      // saffron – main brand colour
  secondary: '#6B1E1E',    // maroon – darker brand tone
  accent: '#1B6E8C',       // peacock – accent colour
  muted: '#6B7280',        // neutral gray
  background: '#FFFFFF',
  foreground: '#0F172A',
  card: '#F9FAFB',
  border: '#D1D5DB',
  ring: '#3B82F6',
};

export const BORDER_WIDTH = {
  0: '0px',
  1: '1px',
  2: '2px',
  4: '4px',
  8: '8px',
  10: '10px',
  12: '12px',
  16: '16px',
};

export const RADIUS = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '1.5rem',
  full: '9999px',
};

export const TYPOGRAPHY = {
  // Text size aliases (mapped from text-*, text-sm, text-lg, etc.)
  textxs: '0.75rem',   // text-xs
  textsm: '0.875rem',  // text-sm
  textbase: '1rem',    // text-base
  textlg: '1.125rem',  // text-lg
  textxl: '1.25rem',   // text-xl
  text2xl: '1.5rem',   // text-2xl
  text3xl: '1.5rem',   // text-3xl (same as 2xl in Tailwind)
  text4xl: '1.75rem',  // text-4xl

  // Weight aliases
  weightregular: '400',
  weightmedium: '500',
  weightbold: '700',
  weightblack: '800',
};

export const DURATION = {
  75: '75ms',
  100: '100ms',
  200: '200ms',
  300: '300ms',
  500: '500ms',
};

export const EASING = {
  default: 'cubic-bezier(0.4, 0, 0.165, 1)', // Tailwind's ease-out
  easeIn: 'cubic-bezier(0.4, 0, 0.165, 1)',
  easeOut: 'cubic-bezier(0.4, 0, 0.165, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.165, 1)',
};

export const UTILITIES = {
  cursorpointer: 'cursor-pointer',
  selectnone: 'select-none',
  pointerseNone: 'pointer-events-none',
  whitespaceNowrap: 'whitespace-nowrap',
  breakwords: 'break-words',
};