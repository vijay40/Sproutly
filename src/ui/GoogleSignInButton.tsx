import { Pressable, View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from './Text';

interface Props {
  onPress: () => void;
  disabled?: boolean;
  label?: string; // defaults to "Continue with Google"
}

export function GoogleSignInButton({ onPress, disabled, label = 'Continue with Google' }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: disabled ? 0.4 : pressed ? 0.92 : 1 }]}
    >
      <GLogo />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

function GLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48" accessibilityElementsHidden>
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18A13.77 13.77 0 0 1 10.96 24c0-1.45.25-2.85.69-4.18v-5.7H4.34A22 22 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7C13.42 14.62 18.27 10.75 24 10.75z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F1F3F4',
    borderRadius: 12,
    paddingHorizontal: 20,
    height: 52,
    alignSelf: 'stretch',
  },
  label: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 16,
    letterSpacing: 0.1,
    color: '#3C4043',
  },
});
