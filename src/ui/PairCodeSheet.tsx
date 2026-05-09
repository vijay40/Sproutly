import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing } from '../theme/tokens';
import { BodyEmphasis, Body, Caption, Text } from './Text';
import { BottomSheet } from './BottomSheet';
import { PrimaryButton } from './Button';
import { tapLight, tapSuccess } from '../lib/haptics';

interface Props {
  visible: boolean;
  code: string | null;
  expiresAt: Date | null;
  onClose: () => void;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expired';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatCode(raw: string | null): string {
  if (!raw) return '— — — — — —';
  const clean = raw.replace(/\D/g, '').padEnd(6, ' ').slice(0, 6);
  return `${clean.slice(0, 3)} ${clean.slice(3)}`;
}

const STEPS = [
  'Open Sproutly on the iPad.',
  'Tap "I\'m setting up a kid\'s iPad".',
  'Enter this code.',
];

export function PairCodeSheet({ visible, code, expiresAt, onClose }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCopied(false);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible]);

  const remaining = useMemo(() => {
    if (!expiresAt) return 0;
    return expiresAt.getTime() - now;
  }, [expiresAt, now]);

  async function onCopy() {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    tapSuccess();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <BodyEmphasis style={{ textAlign: 'center', fontSize: 22, lineHeight: 28 }}>
        Pair this iPad
      </BodyEmphasis>
      <Caption style={{ textAlign: 'center', marginTop: spacing.xs }}>
        Enter this code on the iPad within the time limit.
      </Caption>

      <View
        style={{
          backgroundColor: colors.purpleWash,
          borderRadius: 20,
          marginTop: spacing.lg,
          paddingVertical: spacing.wide,
          paddingHorizontal: spacing.md,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'LexendDeca-Bold',
            fontSize: 44,
            lineHeight: 54,
            color: colors.purple,
            letterSpacing: 6,
          }}
        >
          {formatCode(code)}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                fontFamily: 'LexendDeca-SemiBold',
                fontSize: 12,
                color: colors.purple,
              }}
            >
              ⏱  Expires {formatCountdown(remaining)}
            </Text>
          </View>
          <Pressable
            onPress={() => { tapLight(); void onCopy(); }}
            accessibilityRole="button"
            accessibilityLabel="Copy code"
            style={({ pressed }) => ({
              backgroundColor: colors.white,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 6,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: 'LexendDeca-SemiBold',
                fontSize: 12,
                color: colors.purple,
              }}
            >
              {copied ? '✓  Copied' : '📋  Copy'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {STEPS.map((step, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.purpleWash,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'LexendDeca-SemiBold',
                  fontSize: 13,
                  color: colors.purple,
                }}
              >
                {i + 1}
              </Text>
            </View>
            <Body style={{ flex: 1 }}>{step}</Body>
          </View>
        ))}
      </View>

      <PrimaryButton
        title="Done"
        size="lg"
        fullWidth
        onPress={() => { tapLight(); onClose(); }}
        style={{ marginTop: spacing.xl }}
      />
    </BottomSheet>
  );
}
