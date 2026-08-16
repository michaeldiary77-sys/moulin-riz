import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import { useAppTheme } from '@/lib/theme/useAppTheme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(drawer)',
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
  const [databaseReady, setDatabaseReady] = useState(false);
  const [erreurInit, setErreurInit] = useState<string | null>(null);
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    if (allFontsLoaded && (databaseReady || erreurInit)) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [allFontsLoaded, databaseReady, erreurInit]);

  // En cas d'échec (base corrompue, stockage plein...), on affiche un écran
  // d'erreur avec un bouton pour réessayer plutôt que de rester bloqué sur
  // le splash screen indéfiniment.
  useEffect(() => {
    let annule = false;
    initDatabase()
      .then(() => {
        if (!annule) {
          setErreurInit(null);
          setDatabaseReady(true);
        }
      })
      .catch((error) => {
        console.error('Erreur lors de l\'initialisation de la base de données :', error);
        if (!annule) {
          setErreurInit(error instanceof Error ? error.message : 'Erreur inconnue au démarrage.');
        }
      });
    return () => {
      annule = true;
    };
  }, [tentative]);

  if (!allFontsLoaded) {
    return null;
  }

  if (erreurInit) {
    return <EcranErreurDemarrage message={erreurInit} onReessayer={() => setTentative((t) => t + 1)} />;
  }

  if (!databaseReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
          <Stack.Screen name="journee-detail" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function EcranErreurDemarrage({
  message,
  onReessayer,
}: {
  message: string;
  onReessayer: () => void;
}) {
  const theme = useAppTheme();
  return (
    <SafeAreaProvider>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.xl,
          gap: theme.spacing.md,
          backgroundColor: theme.colors.background,
        }}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text
          style={{
            fontFamily: theme.fontFamilies.headlineSemiBold,
            fontSize: theme.fontSizes.headlineSm,
            color: theme.colors.onSurface,
            textAlign: 'center',
          }}>
          Impossible de démarrer l&apos;application
        </Text>
        <Text
          style={{
            fontFamily: theme.fontFamilies.body,
            fontSize: theme.fontSizes.bodyMd,
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
          }}>
          {message}
        </Text>
        <Pressable
          onPress={onReessayer}
          style={{
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius.md,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            marginTop: theme.spacing.sm,
          }}>
          <Text
            style={{
              fontFamily: theme.fontFamilies.headlineSemiBold,
              fontSize: theme.fontSizes.bodyMd,
              color: theme.colors.onPrimary,
            }}>
            Réessayer
          </Text>
        </Pressable>
      </View>
    </SafeAreaProvider>
  );
}
