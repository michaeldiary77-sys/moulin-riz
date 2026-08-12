import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DetailDette } from '@/components/DetailDette';
import { ListeClientsJour } from '@/components/ListeClientsJour';
import { PopupEncaissement } from '@/components/PopupEncaissement';
import { PopupModifierClient } from '@/components/PopupModifierClient';
import { PopupNouveauClient } from '@/components/PopupNouveauClient';
import { useProfilActif } from '@/lib/context/ProfilActifContext';
import type { ClientJour } from '@/lib/db/clients';
import { trouverDetteClient, type Dette } from '@/lib/db/dettes';
import { useAppTheme } from '@/lib/theme/useAppTheme';

export default function AccueilScreen() {
  const { profilActif, definirProfilActif } = useProfilActif();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [refreshKey, setRefreshKey] = useState(0);
  const [popupNouveauVisible, setPopupNouveauVisible] = useState(false);
  const [clientAEncaisser, setClientAEncaisser] = useState<ClientJour | null>(null);
  const [clientAModifier, setClientAModifier] = useState<ClientJour | null>(null);
  const [dateSelectionnee, setDateSelectionnee] = useState(() => new Date());
  const [afficherPicker, setAfficherPicker] = useState(false);
  const [detteDetail, setDetteDetail] = useState<Dette | null>(null);

  // Date au format "AAAA-MM-JJ" construite depuis la date choisie.
  const annee = dateSelectionnee.getFullYear();
  const mois = String(dateSelectionnee.getMonth() + 1).padStart(2, '0');
  const jour = String(dateSelectionnee.getDate()).padStart(2, '0');
  const dateAffichee = `${annee}-${mois}-${jour}`;

  // Remboursement d'une dette auto depuis l'historique d'une date passée :
  // on retrouve la Dette+ liée au client du jour (clientJourId) puis on
  // ouvre le même modal de détail que l'écran Dettes.
  async function ouvrirDetailDette(client: ClientJour) {
    const dette = await trouverDetteClient(client.id);
    if (dette) {
      setDetteDetail(dette);
    } else {
      Alert.alert(
        'Dette introuvable',
        "Aucune dette automatique n'est liée à ce client.",
        [{ text: 'OK' }],
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: theme.spacing.md + insets.top }]}>
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

      <View style={styles.dateBar}>
        <Pressable
          style={styles.dateBarZone}
          onPress={() => setAfficherPicker(true)}>
          <MaterialCommunityIcons name="calendar" size={22} color={theme.colors.primary} />
          <Text style={styles.dateBarText}>
            {dateSelectionnee.toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </Pressable>
        <Pressable
          style={styles.aujourdhuiButton}
          onPress={() => setDateSelectionnee(new Date())}>
          <Text style={styles.aujourdhuiButtonText}>Aujourd&apos;hui</Text>
        </Pressable>
      </View>

      {afficherPicker && (
        <DateTimePicker
          value={dateSelectionnee}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, date) => {
            setAfficherPicker(false);
            if (date) {
              setDateSelectionnee(date);
            }
          }}
        />
      )}

      <View style={styles.listeWrapper}>
        <ListeClientsJour
          dateAffichee={dateAffichee}
          refreshKey={refreshKey}
          onClientPresse={(client) => setClientAEncaisser(client)}
          onModifierPresse={(client) => setClientAModifier(client)}
          onSupprimerReussie={() => setRefreshKey((k) => k + 1)}
          onDettePresse={ouvrirDetailDette}
        />
      </View>

      <Pressable style={styles.fab} onPress={() => setPopupNouveauVisible(true)}>
        <MaterialCommunityIcons name="plus" size={32} color={theme.colors.onPrimary} />
      </Pressable>

      <PopupNouveauClient
        visible={popupNouveauVisible}
        dateActuelleVisualisee={dateAffichee}
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

      <DetailDette
        visible={detteDetail !== null}
        dette={detteDetail}
        onFermer={() => setDetteDetail(null)}
        onRembourse={() => setRefreshKey((k) => k + 1)}
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
    dateBar: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    dateBarZone: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    dateBarText: {
      flex: 1,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurface,
    },
    aujourdhuiButton: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    aujourdhuiButtonText: {
      color: theme.colors.primary,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
    },
    listeWrapper: {
      flex: 1,
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
