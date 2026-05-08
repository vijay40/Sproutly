export const colors = {
  white: '#FFFFFF',
  ink: '#24252C',
  muted: '#6E6A7C',

  gray50: '#F5F6F8',
  gray100: '#E8E9EC',

  purple: '#5F33E1',
  purpleInk: '#2A1A8A',
  purpleWash: '#EEE9FF',

  tileSky: '#DDEBFB',
  tilePeach: '#F9E1D4',
  tileLavender: '#E8DDF8',
  tileSage: '#E1EFDF',

  sage: '#E3EED9',
  sageInk: '#3F5B1E',

  gold: '#FBE0BE',
  goldInk: '#7A4A14',
  goldBorder: '#C8A57A',

  danger: '#B84242',
  dangerBorder: '#F0D6D6',

  toggleOff: '#C7CDD9',
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
    fontFamily: 'LexendDeca-Bold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  heading: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  headingSm: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
  bodyEmphasis: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 15,
    lineHeight: 21,
  },
  body: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  label: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const;

export type Tokens = {
  colors: typeof colors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
};
