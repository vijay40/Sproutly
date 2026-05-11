import { KeyboardAvoidingView, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { KidBackgroundPurple } from '../parts/KidBackground';
import { AvatarCircle } from '../parts/AvatarCircle';
import { CodeEntry } from '../../CodeEntry';
import { PrimaryButton } from '../../Button';
import { kidInk, kidMuted, kidPurple, kidPurpleWash } from '../theme';

export function PrePairScene({
  code,
  onChangeCode,
  onSubmit,
  loading,
}: {
  code: string;
  onChangeCode: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const canSubmit = /^\d{6}$/.test(code) && !loading;

  return (
    <View
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <KidBackgroundPurple />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            flexDirection: landscape ? 'row' : 'column',
            paddingHorizontal: 40,
            paddingVertical: 40,
            alignItems: 'center',
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, justifyContent: 'center', gap: 24, maxWidth: landscape ? undefined : 520 }}>
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: landscape ? 40 : 32, color: kidMuted, fontFamily: 'LexendDeca-SemiBold' }}>
                Hi there! 👋
              </Text>
              <Text
                style={{
                  fontSize: landscape ? 48 : 36,
                  lineHeight: landscape ? 56 : 44,
                  color: kidInk,
                  fontFamily: 'LexendDeca-Bold',
                }}
              >
                Ask a grown-up{'\n'}to pair this iPad
              </Text>
            </View>

            <CodeEntry value={code} onChange={onChangeCode} onSubmit={onSubmit} />

            <Text style={{ fontSize: 16, color: kidMuted, fontFamily: 'LexendDeca-Regular' }}>
              They&rsquo;ll find the code in Settings on their phone.
            </Text>

            <View style={{ alignSelf: 'flex-start' }}>
              <PrimaryButton
                title={loading ? 'Pairing…' : 'Pair this iPad'}
                size="lg"
                onPress={onSubmit}
                disabled={!canSubmit}
              />
            </View>
          </View>

          <View style={{ alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 24 }}>
            <AvatarCircle emoji="🥚" size={420} />
            <View
              style={{
                backgroundColor: kidPurpleWash,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 22,
              }}
            >
              <Text style={{ color: kidPurple, fontSize: 14, fontFamily: 'LexendDeca-SemiBold' }}>Not paired yet</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
