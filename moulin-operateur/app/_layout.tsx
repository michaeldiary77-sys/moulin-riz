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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { SelecteurProfil } from '@/components/SelecteurProfil';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cloturerJoursPrecedents } from '@/lib/db/clients';
import { initDatabase } from '@/lib/db/database';
import { ProfilActifProvider, useProfilActif } from '@/lib/context/ProfilActifContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(drawer)',
};

export default function RootLayout() {
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

  // Initialisation de la base PUIS clôture automatique des jours
  // précédents : la clôture doit s'exécuter après initDatabase() (qui crée
  // les tables), sinon elle pourrait lire des tables inexistantes sur une
  // base neuve. Tout client encore "en_attente" sur une date passée passe
  // en "non_paye" avec une Dette+ créée automatiquement.
  useEffect(() => {
    async function initialiserApplication() {
      await initDatabase();
      const n = await cloturerJoursPrecedents();
      console.log(`Clôture auto : ${n} client(s) traité(s).`);
    }
    initialiserApplication().catch((error) => {
      console.error(
        'Erreur lors de l\'initialisation ou de la clôture automatique des jours précédents :',
        error,
      );
    });
  }, []);

  if (!allFontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ProfilActifProvider>
        <ContenuApplication />
      </ProfilActifProvider>
    </SafeAreaProvider>
  );
}

function ContenuApplication() {
  const { profilActif } = useProfilActif();
  const colorScheme = useColorScheme();

  if (profilActif === null) {
    return <SelecteurProfil />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
