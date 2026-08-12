import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { DetailDette } from '@/components/DetailDette';
import { ListeClientsJour } from '@/components/ListeClientsJour';
import { PopupEncaissement } from '@/components/PopupEncaissement';
import { PopupModifierClient } from '@/components/PopupModifierClient';
import { PopupNouveauClient } from '@/components/PopupNouveauClient';
import { AppBar, TextButton, androidRipple } from '@/components/ui/material';
import { useProfilActif } from '@/lib/context/ProfilActifContext';
import type { ClientJour } from '@/lib/db/clients';
import { trouverDetteClient, type Dette } from '@/lib/db/dettes';
import { useAppTheme } from '@/lib/theme/useAppTheme';

export default function AccueilScreen() {
  const { profilActif, definirProfilActif } = useProfilActif();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [refreshKey, setRefreshKey] = useState(0);
  const [popupNouveauVisible, setPopupNouveauVisible] = useState(false);
  const [clientAEncaisser, setClientAEncaisser] = useState<ClientJour | null>(null);
  const [clientAModifier, setClientAModifier] = useState<ClientJour | null>(null);
  const [dateSelectionnee, setDateSelectionnee] = useState(() => new Date());
  const [afficherPicker, setAfficherPicker] = useState(false);
  const [detteDetail, setDetteDetail] = useState<Dette | null>(null);

  const annee = dateSelectionnee.getFullYear();
  const mois = String(dateSelectionnee.getMonth() + 1).padStart(2, '0');
  const jour = String(dateSelectionnee.getDate()).padStart(2, '0');
  const dateAffichee = `${annee}-${mois}-${jour}`;

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
      <AppBar
        title="Accueil"
        subtitle={profilActif?.nom ? `Opérateur : ${profilActif.nom}` : undefined}
        left={
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {profilActif?.nom?.charAt(0).toUpperCase() ?? ''}
            </Text>
          </View>
        }
        right={<TextButton label="Changer" onPress={() => definirProfilActif(null)} />}
      />

      <View style={styles.dateBar}>
        <Pressable
          style={styles.dateBarZone}
          android_ripple={androidRipple(theme.colors.ripple)}
          onPress={() => setAfficherPicker(true)}>
          <MaterialCommunityIcons name="calendar" size={22} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.dateBarText}>
            {dateSelectionnee.toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </Pressable>
        <TextButton label="Aujourd'hui" onPress={() => setDateSelectionnee(new Date())} />
      </View>

      {afficherPicker && (
        <DateTimePicker
          value={dateSelectionnee}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, date) => {
            if (Platform.OS === 'android') {
              setAfficherPicker(false);
            }
            if (event.type === 'set' && date) {
              setDateSelectionnee(date);
            }
            if (event.type === 'dismissed') {
              setAfficherPicker(false);
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

      <Pressable
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Nouveau client"
        android_ripple={androidRipple(theme.colors.ripple, true)}
        onPress={() => setPopupNouveauVisible(true)}>
        <MaterialCommunityIcons name="plus" size={28} color={theme.colors.onPrimary} />
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
    avatar: {
      width: 40,
      height: 40,
      marginHorizontal: 4,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLetter: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.bodyLg,
      color: theme.colors.primary,
    },
    dateBar: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline,
    },
    dateBarZone: {
      flex: 1,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    dateBarText: {
      flex: 1,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurface,
    },
    listeWrapper: {
      flex: 1,
    },
    fab: {
      position: 'absolute',
      bottom: 72,
      right: theme.spacing.lg,
      width: 56,
      height: 56,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      ...theme.elevation.fab,
    },
  });
}
