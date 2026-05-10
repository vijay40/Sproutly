import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
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
  const outerRadius = Math.round(Math.min(width, height) * 0.24);
  const innerInset = 6;
  const innerRadius = Math.max(4, outerRadius - innerInset);
  const dotSize = Math.max(6, Math.round(width / 7));
  const fill = active && !digit ? colors.purpleWash : colors.white;
  const dashStroke = active ? colors.purple : colors.purpleWash;

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: fill,
          borderRadius: outerRadius,
        }}
      />
      <Svg
        width={width - innerInset * 2}
        height={height - innerInset * 2}
        style={{ position: 'absolute', left: innerInset, top: innerInset }}
      >
        <Rect
          x={1}
          y={1}
          width={width - innerInset * 2 - 2}
          height={height - innerInset * 2 - 2}
          rx={innerRadius}
          ry={innerRadius}
          fill="none"
          stroke={dashStroke}
          strokeWidth={2}
          strokeDasharray="6 5"
          strokeLinecap="round"
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
      ) : (
        <View
          style={{
            width: dotSize,
            height: dotSize,
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
