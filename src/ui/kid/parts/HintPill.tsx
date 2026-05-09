import { View, Text } from 'react-native';
import { kidPurple, kidPurpleWash } from '../theme';

export function HintPill({ text }: { text: string }) {
  return (
    <View
      style={{
        backgroundColor: kidPurpleWash,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 22,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: kidPurple, fontSize: 16, fontFamily: 'LexendDeca-SemiBold' }}>{text}</Text>
    </View>
  );
}
