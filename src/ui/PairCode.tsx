import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { Text } from './Text';

/**
 * Scalloped 6-digit pair-code tiles. Two modes:
 *   - mode="display" — read-only (phone shows the code for the kid to see)
 *   - mode="entry"   — focus-managed (iPad types the code in)
 *
 * Shape matches the K1 Figma frame: scalloped/cloud outline, white fill, subtle drop shadow.
 * Digit typography is Lexend Deca Bold, centered.
 */

type DisplayProps = {
  mode: 'display';
  code: string;
  tileWidth?: number;
  tileHeight?: number;
};

type EntryProps = {
  mode: 'entry';
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  tileWidth?: number;
  tileHeight?: number;
};

type Props = DisplayProps | EntryProps;

const LEN = 6;

/**
 * Builds a scalloped-rect SVG path — a rectangle with small half-circle
 * bumps marching along each edge. Corners are smooth quarter-circles.
 */
function scallopedPath(w: number, h: number, bumpR: number): string {
  const cornerR = bumpR * 1.6;
  const topEdge = w - cornerR * 2;
  const sideEdge = h - cornerR * 2;
  const bumpsX = Math.max(1, Math.round(topEdge / (bumpR * 2)));
  const bumpsY = Math.max(1, Math.round(sideEdge / (bumpR * 2)));
  const stepX = topEdge / bumpsX;
  const stepY = sideEdge / bumpsY;

  const parts: string[] = [];
  parts.push(`M ${cornerR} 0`);
  for (let i = 0; i < bumpsX; i++) {
    const x = cornerR + (i + 1) * stepX;
    parts.push(`A ${stepX / 2} ${bumpR} 0 0 1 ${x} 0`);
  }
  parts.push(`A ${cornerR} ${cornerR} 0 0 1 ${w} ${cornerR}`);
  for (let i = 0; i < bumpsY; i++) {
    const y = cornerR + (i + 1) * stepY;
    parts.push(`A ${bumpR} ${stepY / 2} 0 0 1 ${w} ${y}`);
  }
  parts.push(`A ${cornerR} ${cornerR} 0 0 1 ${w - cornerR} ${h}`);
  for (let i = 0; i < bumpsX; i++) {
    const x = w - cornerR - (i + 1) * stepX;
    parts.push(`A ${stepX / 2} ${bumpR} 0 0 1 ${x} ${h}`);
  }
  parts.push(`A ${cornerR} ${cornerR} 0 0 1 0 ${h - cornerR}`);
  for (let i = 0; i < bumpsY; i++) {
    const y = h - cornerR - (i + 1) * stepY;
    parts.push(`A ${bumpR} ${stepY / 2} 0 0 1 0 ${y}`);
  }
  parts.push(`A ${cornerR} ${cornerR} 0 0 1 ${cornerR} 0`);
  parts.push('Z');
  return parts.join(' ');
}

function Tile({
  width,
  height,
  digit,
  active,
}: {
  width: number;
  height: number;
  digit: string;
  active: boolean;
}) {
  const path = scallopedPath(width, height, Math.max(4, Math.round(width / 10)));
  const fill = active && !digit ? colors.purpleWash : colors.white;
  const stroke = active ? colors.purple : colors.gray100;

  return (
    <View
      style={{
        width,
        height,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg
        width={width}
        height={height}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <Path d={path} fill={fill} stroke={stroke} strokeWidth={1.5} />
      </Svg>
      {digit ? (
        <Text
          style={{
            fontFamily: 'LexendDeca-Bold',
            fontSize: Math.round(height * 0.44),
            lineHeight: Math.round(height * 0.52),
            color: colors.ink,
          }}
        >
          {digit}
        </Text>
      ) : (
        <View
          style={{
            width: Math.max(4, Math.round(width / 10)),
            height: Math.max(4, Math.round(width / 10)),
            borderRadius: 999,
            backgroundColor: colors.purpleWash,
          }}
        />
      )}
    </View>
  );
}

export function PairCode(props: Props) {
  const inputRef = useRef<TextInput>(null);
  const tileWidth = props.tileWidth ?? (props.mode === 'entry' ? 62 : 48);
  const tileHeight = props.tileHeight ?? (props.mode === 'entry' ? 80 : 62);

  const code = props.mode === 'display' ? props.code : props.value;
  const digits = Array.from({ length: LEN }, (_, i) => code[i] ?? '');
  const activeIndex = props.mode === 'entry' ? code.length : -1;

  const tileRow = (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
      {digits.map((d, i) => (
        <Tile
          key={i}
          width={tileWidth}
          height={tileHeight}
          digit={d}
          active={i === activeIndex}
        />
      ))}
    </View>
  );

  if (props.mode === 'display') {
    return tileRow;
  }

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessibilityLabel="Enter 6-digit pairing code">
      {tileRow}
      <TextInput
        ref={inputRef}
        value={props.value}
        onChangeText={(t) => {
          const next = t.replace(/\D/g, '').slice(0, LEN);
          props.onChange(next);
          if (next.length === LEN) props.onSubmit?.();
        }}
        keyboardType="number-pad"
        maxLength={LEN}
        autoFocus
        style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
      />
    </Pressable>
  );
}
