import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, useFonts as usePlusJakartaSans } from '@expo-google-fonts/plus-jakarta-sans';
import {
  Inter_400Regular,
  Inter_500Medium,
  useFonts as useInter,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium, useFonts as useJetBrainsMono } from '@expo-google-fonts/jetbrains-mono';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initDatabase } from '@/lib/db/database';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = usePlusJakartaSans({
    PlusJakartaSans_700Bold,
    PlusJakartaSans_600SemiBold,
  });
  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_500Medium,
  });
  const [monoLoaded] = useJetBrainsMono({
    JetBrainsMono_500Medium,
  });
  const allFontsLoaded = fontsLoaded && interLoaded && monoLoaded;

  useEffect(() => {
    if (allFontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [allFontsLoaded]);

  useEffect(() => {
    initDatabase().catch((error) => {
      console.error('Erreur lors de l\'initialisation de la base de données :', error);
    });
  }, []);

  if (!allFontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="journee-detail" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
