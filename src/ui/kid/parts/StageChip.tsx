import { View, Text } from 'react-native';
import { kidPurple, kidWhite } from '../theme';

export function StageChip({ stage, name }: { stage: number; name: string }) {
  return (
    <View
      style={{
        backgroundColor: kidPurple,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 24,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: kidWhite, fontSize: 16, fontFamily: 'LexendDeca-SemiBold' }}>
        ✨ Stage {stage} · {name}
      </Text>
    </View>
  );
}
