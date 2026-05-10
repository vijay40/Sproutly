import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { Text } from './Text';

/**
 * 6-digit pair-code tiles. Two modes:
 *   - mode="display" — read-only (phone shows the code for the kid to see)
 *   - mode="entry"   — focus-managed (iPad types the code in)
 *
 * Shape matches the K1 Figma frame: rounded white tile with a dashed inner border
 * and a small purple dot placeholder (replaced by the digit once typed).
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

const TILE_RADIUS = 18;
const TILE_STROKE = 2;
const DASH_COLOR = '#EEE9FF';

function Tile({
  width,
  height,
  digit,
}: {
  width: number;
  height: number;
  digit: string;
}) {
  return (
    <View
      style={{
        width,
        height,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: TILE_RADIUS,
        backgroundColor: colors.white,
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.06,
            shadowRadius: 28,
          },
          android: { elevation: 3 },
          default: {},
        }),
      }}
    >
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFillObject}
      >
        <Rect
          x={TILE_STROKE / 2}
          y={TILE_STROKE / 2}
          width={width - TILE_STROKE}
          height={height - TILE_STROKE}
          rx={TILE_RADIUS - TILE_STROKE / 2}
          ry={TILE_RADIUS - TILE_STROKE / 2}
          fill="none"
          stroke={DASH_COLOR}
          strokeWidth={TILE_STROKE}
          strokeDasharray="6 4"
          strokeLinecap="butt"
        />
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
      ) : null}
    </View>
  );
}

export function PairCode(props: Props) {
  const inputRef = useRef<TextInput>(null);
  const tileWidth = props.tileWidth ?? (props.mode === 'entry' ? 62 : 48);
  const tileHeight = props.tileHeight ?? (props.mode === 'entry' ? 80 : 62);

  const code = props.mode === 'display' ? props.code : props.value;
  const digits = Array.from({ length: LEN }, (_, i) => code[i] ?? '');

  const tileRow = (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
      {digits.map((d, i) => (
        <Tile key={i} width={tileWidth} height={tileHeight} digit={d} />
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
