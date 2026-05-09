import { View, Text } from 'react-native';
import { kidMuted } from '../theme';

export function CornerOfflineDot() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 14,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        opacity: 0.35,
      }}
    >
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: kidMuted }} />
      <Text style={{ color: kidMuted, fontSize: 10, fontFamily: 'LexendDeca-Regular' }}>offline</Text>
    </View>
  );
}
