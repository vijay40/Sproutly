import Svg, { Path, Circle } from 'react-native-svg';
import { ReactNode } from 'react';

interface IconProps {
  size?: number;
  color?: string;
}

function Base({ size = 24, children }: { size: number; children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

export function HomeIcon({ size = 24, color = '#6E6A7C' }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Base>
  );
}

export function ClipIcon({ size = 24, color = '#6E6A7C' }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M8 4h8a2 2 0 0 1 2 2v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="m9 13 2 2 4-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  );
}

export function ChartIcon({ size = 24, color = '#6E6A7C' }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M5 20V10M12 20V4M19 20v-7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Base>
  );
}

export function GearIcon({ size = 24, color = '#6E6A7C' }: IconProps) {
  return (
    <Base size={size}>
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
      <Path
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Base>
  );
}

export function PlusIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Base>
  );
}

export function BellIcon({ size = 24, color = '#6E6A7C' }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5 2 6H4c.5-1 2-2 2-6Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 18a2 2 0 0 0 4 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Base>
  );
}

export function ArrowLeftIcon({ size = 24, color = '#24252C' }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 12h12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Base>
  );
}

export function ChevronRightIcon({ size = 20, color = '#6E6A7C' }: IconProps) {
  return (
    <Base size={size}>
      <Path d="m9 6 6 6-6 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  );
}

export function CheckIcon({ size = 16, color = '#3F5B1E' }: IconProps) {
  return (
    <Base size={size}>
      <Path d="m5 12 5 5 9-11" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  );
}

export function SearchIcon({ size = 16, color = '#6E6A7C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M 9 1 C 4.58 1 1 4.58 1 9 C 1 13.42 4.58 17 9 17 C 13.42 17 17 13.42 17 9 C 17 4.58 13.42 1 9 1 Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M 15 15 L 19 19"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PencilIcon({ size = 16, color = '#5F33E1' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M 2 12 L 10 4 L 12 6 L 4 14 L 2 14 Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
