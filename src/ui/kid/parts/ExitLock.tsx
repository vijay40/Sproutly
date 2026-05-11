import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { tapLight } from '../../../lib/haptics';

/**
 * Low-discoverability corner affordance that exits kid view.
 *
 * Renders as a small semi-transparent circle with a 🔒 glyph — readable to
 * parents, ambiguous to kids. Tapping opens the PIN pad (TODO) before exiting.
 */
export function ExitLock({ size = 36 }: { size?: number }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        tapLight();
        // TODO: route to Exit PIN pad when implemented.
        router.replace('/(parent)/today');
      }}
      accessibilityRole="button"
      accessibilityLabel="Exit kid view"
      hitSlop={12}
      style={({ pressed }) => ({
        position: 'absolute',
        top: 20,
        right: 20,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: pressed ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      })}
    >
      <Text style={{ fontSize: Math.round(size * 0.5) }}>🔒</Text>
    </Pressable>
  );
}
