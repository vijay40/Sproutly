import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { tapLight } from '../../../lib/haptics';

type Props = {
  size?: number;
  /**
   * Layout:
   * - 'absolute' (default) pins to top-right of the parent — used in iPad layouts.
   * - 'inline' renders as a normal child (no positioning) — used next to the
   *   stage badge on phone so the hit target stays clear of the status bar.
   */
  variant?: 'absolute' | 'inline';
};

/**
 * Low-discoverability corner affordance that exits kid view.
 *
 * Renders as a small semi-transparent circle with a 🔒 glyph — readable to
 * parents, ambiguous to kids. Tapping routes to the exit PIN pad.
 */
export function ExitLock({ size = 36, variant = 'absolute' }: Props) {
  const router = useRouter();
  const absolute = variant === 'absolute';
  return (
    <Pressable
      onPress={() => {
        tapLight();
        router.push('/(kid)/exit-pin');
      }}
      accessibilityRole="button"
      accessibilityLabel="Exit kid view"
      hitSlop={12}
      style={({ pressed }) => ({
        ...(absolute
          ? { position: 'absolute', top: 20, right: 20, zIndex: 10 }
          : null),
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: pressed ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Text style={{ fontSize: Math.round(size * 0.5) }}>🔒</Text>
    </Pressable>
  );
}
