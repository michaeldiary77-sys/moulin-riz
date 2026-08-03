import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { ListeClientsJour } from '@/components/ListeClientsJour';
import { PopupEncaissement } from '@/components/PopupEncaissement';
import { PopupModifierClient } from '@/components/PopupModifierClient';
import { PopupNouveauClient } from '@/components/PopupNouveauClient';
import { useProfilActif } from '@/lib/context/ProfilActifContext';
import type { ClientJour } from '@/lib/db/clients';
import { useAppTheme } from '@/lib/theme/useAppTheme';

export default function AccueilScreen() {
  const { profilActif, definirProfilActif } = useProfilActif();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [popupNouveauVisible, setPopupNouveauVisible] = useState(false);
  const [clientAEncaisser, setClientAEncaisser] = useState<ClientJour | null>(null);
  const [clientAModifier, setClientAModifier] = useState<ClientJour | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Pressable onPress={() => (navigation as any).openDrawer()}>
            <MaterialCommunityIcons name="menu" size={28} color={theme.colors.primary} />
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {profilActif?.nom?.charAt(0).toUpperCase() ?? ''}
            </Text>
          </View>
          <View style={styles.topBarText}>
            <Text style={styles.operateurLabel}>
              Opérateur : {profilActif?.nom}
            </Text>
            <Text style={styles.moulinTitre}>Moulin de Riz</Text>
          </View>
        </View>
        <Pressable style={styles.changerButton} onPress={() => definirProfilActif(null)}>
          <Text style={styles.changerButtonText}>Changer</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <ListeClientsJour
          refreshKey={refreshKey}
          onClientPresse={(client) => setClientAEncaisser(client)}
          onModifierPresse={(client) => setClientAModifier(client)}
          onSupprimerReussie={() => setRefreshKey((k) => k + 1)}
        />
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setPopupNouveauVisible(true)}>
        <MaterialCommunityIcons name="plus" size={32} color={theme.colors.onPrimary} />
      </Pressable>

      <PopupNouveauClient
        visible={popupNouveauVisible}
        profilNom={profilActif?.nom ?? null}
        onFerme={() => setPopupNouveauVisible(false)}
        onClientAjoute={() => setRefreshKey((k) => k + 1)}
      />
      <PopupEncaissement
        visible={clientAEncaisser !== null}
        client={clientAEncaisser}
        onFerme={() => setClientAEncaisser(null)}
        onEncaisse={() => setRefreshKey((k) => k + 1)}
      />
      <PopupModifierClient
        visible={clientAModifier !== null}
        client={clientAModifier}
        onFermer={() => setClientAModifier(null)}
        onModifieReussi={() => setRefreshKey((k) => k + 1)}
      />
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topBar: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    topBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLetter: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.bodyLg,
      color: theme.colors.primary,
    },
    topBarText: {
      gap: 2,
    },
    operateurLabel: {
      fontFamily: theme.fontFamilies.mono,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    moulinTitre: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      color: theme.colors.primary,
    },
    changerButton: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    changerButtonText: {
      color: theme.colors.primary,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.xl + theme.spacing.lg,
    },
    fab: {
      position: 'absolute',
      bottom: theme.spacing.xl,
      right: theme.spacing.lg,
      width: 56,
      height: 56,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
