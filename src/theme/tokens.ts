export const colors = {
  white: '#FFFFFF',
  gray50: '#F5F6F8',
  gray100: '#E8E9EC',
  navyInk: '#1D2A4A',
  muted: '#8791A7',
  cobalt: '#3056D3',
  sky: '#DEEBF6',
  skyInk: '#1D4670',
  gold: '#FBE0BE',
  goldInk: '#7A4A14',
  goldBorder: '#C8A57A',
  sageChip: '#E3EED9',
  sageInk: '#3F5B1E',
  danger: '#B84242',
  dangerBorder: '#F0D6D6',
  toggleOff: '#C7CDD9',
  // Strike-through line color on completed tasks
  strike: '#C4CAD6',
} as const;

export const spacing = {
  xxs: 4,
  xs: 6,
  s: 8,
  sm: 10,
  m: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 22,
  wide: 24,
  section: 32,
} as const;

export const radii = {
  chip: 10,
  input: 12,
  card: 16,
  screen: 24,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontFamily: 'Fraunces-Medium',
    fontSize: 30,
    lineHeight: 33, // 1.1
    letterSpacing: -0.6,
  },
  heading: {
    fontFamily: 'Fraunces-Medium',
    fontSize: 22,
    lineHeight: 26, // 1.2
    letterSpacing: -0.4,
  },
  headingLg: {
    fontFamily: 'Fraunces-Medium',
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
  },
  bodyEmphasis: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 21,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  codeDigit: {
    fontFamily: 'Fraunces-SemiBold',
    fontSize: 28,
    lineHeight: 28,
  },
} as const;

export type Tokens = {
  colors: typeof colors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
};
