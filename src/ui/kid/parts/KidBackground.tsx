import { View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * Two canonical kid-screen backgrounds. Specs copied verbatim from the Figma
 * K2Background / K6 evolution frames via the code-connect plugin — do NOT
 * re-derive from images.
 *
 *   Purple (default day, K2 Figma): linear left→right #F2EDFF → #EFE7FF,
 *                                   purple-tinted blobs.
 *   Night  (evolution):             linear left→right #2B1473 → #5E33E0,
 *                                   white halos.
 *
 * Orientation is detected from window size so the background re-flows on rotation.
 */

interface Blob {
  x: number;
  y: number;
  size: number;
  color: string;
  /** applied on the fill; matches `fills[].opacity` in Figma */
  opacity: number;
}

// ── Purple day blobs (K2Background, Figma) ──────────────────────────────────
const PURPLE_LANDSCAPE: Blob[] = [
  { x: -60,   y: -60,  size: 200, color: '#D8C7FF', opacity: 0.55 },
  { x: 1074,  y: 120,  size: 160, color: '#E9DCFF', opacity: 0.5  },
  { x: 1014,  y: 594,  size: 240, color: '#C8B4FF', opacity: 0.5  },
  { x: -40,   y: 634,  size: 140, color: '#D8C7FF', opacity: 0.4  },
];

const PURPLE_PORTRAIT: Blob[] = [
  { x: -60,  y: -60,   size: 200, color: '#D8C7FF', opacity: 0.55 },
  { x: 714,  y: 120,   size: 160, color: '#E9DCFF', opacity: 0.5  },
  { x: 654,  y: 934,   size: 260, color: '#C8B4FF', opacity: 0.5  },
  { x: -40,  y: 974,   size: 160, color: '#D8C7FF', opacity: 0.4  },
];

// ── Night evolution halos ───────────────────────────────────────────────────
const NIGHT_LANDSCAPE: Blob[] = [
  { x: 237, y: -3,  size: 720, color: '#FFFFFF', opacity: 0.12 },
  { x: 317, y: 77,  size: 560, color: '#FFFFFF', opacity: 0.20 },
  { x: 387, y: 147, size: 420, color: '#FFFFFF', opacity: 0.35 },
  { x: 447, y: 207, size: 300, color: '#FFFFFF', opacity: 0.60 },
];

const NIGHT_PORTRAIT: Blob[] = [
  { x: 57,  y: 160, size: 720, color: '#FFFFFF', opacity: 0.05 },
  { x: 137, y: 240, size: 560, color: '#FFFFFF', opacity: 0.08 },
  { x: 207, y: 310, size: 420, color: '#FFFFFF', opacity: 0.12 },
  { x: 267, y: 370, size: 300, color: '#FFFFFF', opacity: 0.16 },
];

function Gradient({ width, height, from, to }: { width: number; height: number; from: string; to: string }) {
  return (
    <Svg
      key={`${width}x${height}`}
      width={width}
      height={height}
      style={{ position: 'absolute', left: 0, top: 0 }}
    >
      <Defs>
        <LinearGradient id="g" x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill="url(#g)" />
    </Svg>
  );
}

function Blobs({ blobs }: { blobs: Blob[] }) {
  return (
    <>
      {blobs.map((b, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            width: b.size,
            height: b.size,
            borderRadius: b.size / 2,
            backgroundColor: b.color,
            opacity: b.opacity,
          }}
        />
      ))}
    </>
  );
}

export function KidBackgroundPurple() {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  return (
    <>
      <Gradient width={width} height={height} from="#F2EDFF" to="#EFE7FF" />
      <Blobs blobs={landscape ? PURPLE_LANDSCAPE : PURPLE_PORTRAIT} />
    </>
  );
}

export function KidBackgroundNight() {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  return (
    <>
      <Gradient width={width} height={height} from="#2B1473" to="#5E33E0" />
      <Blobs blobs={landscape ? NIGHT_LANDSCAPE : NIGHT_PORTRAIT} />
    </>
  );
}
