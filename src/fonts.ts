import { useFonts } from 'expo-font';
import {
  LexendDeca_400Regular,
  LexendDeca_500Medium,
  LexendDeca_600SemiBold,
  LexendDeca_700Bold,
} from '@expo-google-fonts/lexend-deca';

export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    'LexendDeca-Regular': LexendDeca_400Regular,
    'LexendDeca-Medium': LexendDeca_500Medium,
    'LexendDeca-SemiBold': LexendDeca_600SemiBold,
    'LexendDeca-Bold': LexendDeca_700Bold,
  });
  return loaded;
}
