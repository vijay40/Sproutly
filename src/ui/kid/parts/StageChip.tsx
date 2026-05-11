import { View, Text } from 'react-native';
import { kidPurple, kidWhite } from '../theme';

export function StageChip({
  stage,
  name,
  compact = false,
}: {
  stage: number;
  name: string;
  compact?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: kidPurple,
        paddingHorizontal: compact ? 10 : 15,
        paddingVertical: compact ? 5 : 8,
        borderRadius: compact ? 14 : 24,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          color: kidWhite,
          fontSize: compact ? 11 : 16,
          fontFamily: 'LexendDeca-SemiBold',
        }}
      >
        {compact ? `✨ S${stage} · ${name}` : `✨ Stage ${stage} · ${name}`}
      </Text>
    </View>
  );
}
