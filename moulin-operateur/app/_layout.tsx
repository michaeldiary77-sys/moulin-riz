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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { SelecteurProfil } from '@/components/SelecteurProfil';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cloturerJoursPrecedents } from '@/lib/db/clients';
import { initDatabase } from '@/lib/db/database';
import { ProfilActifProvider, useProfilActif } from '@/lib/context/ProfilActifContext';
import { useAppTheme } from '@/lib/theme/useAppTheme';

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
  const [databaseReady, setDatabaseReady] = useState(false);
  const [erreurInit, setErreurInit] = useState<string | null>(null);
  const [tentative, setTentative] = useState(0);
  const pret = allFontsLoaded && databaseReady;

  // L'écran d'erreur (et la fermeture du splash) ne doit JAMAIS être
  // conditionné par allFontsLoaded : si les polices restent bloquées,
  // l'erreur doit quand même pouvoir s'afficher (avec la police système
  // par défaut), sinon on reste coincé sur le splash sans aucun message,
  // quelle que soit la cause réelle du blocage.
  useEffect(() => {
    if (pret || erreurInit) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [pret, erreurInit]);

  // Délai de sécurité global : si les polices OU la base ne sont pas
  // prêtes après ce délai, on affiche une erreur qui indique laquelle des
  // deux bloque, plutôt que de rester bloqué indéfiniment sur le splash
  // sans aucune information exploitable.
  useEffect(() => {
    if (pret) {
      return;
    }
    const DELAI_MAX_MS = 15000;
    const id = setTimeout(() => {
      setErreurInit(
        (actuel) =>
          actuel ??
          `Démarrage trop long (plus de 15 secondes). Polices : ${
            allFontsLoaded ? 'chargées' : 'bloquées'
          }. Base de données : ${
            databaseReady ? 'prête' : 'bloquée'
          }. Réessayez ; si le problème persiste, redémarrez le téléphone ou réinstallez l'application.`,
      );
    }, DELAI_MAX_MS);
    return () => clearTimeout(id);
  }, [pret, allFontsLoaded, databaseReady, tentative]);

  // Initialisation de la base PUIS clôture automatique des jours
  // précédents : la clôture doit s'exécuter après initDatabase() (qui crée
  // les tables), sinon elle pourrait lire des tables inexistantes sur une
  // base neuve. Tout client encore "en_attente" sur une date passée passe
  // en "non_paye" avec une Dette+ créée automatiquement.
  useEffect(() => {
    let regle = false;
    async function initialiserApplication() {
      try {
        await initDatabase();
        const n = await cloturerJoursPrecedents();
        console.log(`Clôture auto : ${n} client(s) traité(s).`);
        if (!regle) {
          regle = true;
          setDatabaseReady(true);
        }
      } catch (error) {
        console.error(
          'Erreur lors de l\'initialisation ou de la clôture automatique des jours précédents :',
          error,
        );
        if (!regle) {
          regle = true;
          setErreurInit(
            error instanceof Error ? error.message : 'Erreur inconnue au démarrage.',
          );
        }
      }
    }
    initialiserApplication();
    return () => {
      regle = true;
    };
  }, [tentative]);

  if (erreurInit) {
    return (
      <EcranErreurDemarrage
        message={erreurInit}
        onReessayer={() => {
          setErreurInit(null);
          setDatabaseReady(false);
          setTentative((t) => t + 1);
        }}
      />
    );
  }

  if (!pret) {
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
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
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
