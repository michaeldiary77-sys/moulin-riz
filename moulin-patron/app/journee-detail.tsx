import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listerClientsDuJour, type ClientJour } from '@/lib/db/clients';
import { useAppTheme } from '@/lib/theme/useAppTheme';

function libelleStatut(statut: string): { texte: string; couleur: string } {
  switch (statut) {
    case 'paye':
      return { texte: 'Payé', couleur: '#16a34a' };
    case 'non_paye':
      return { texte: 'Non payé', couleur: '#ef4444' };
    default:
      return { texte: 'En attente', couleur: '#f59e0b' };
  }
}

export default function JourneeDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const [clients, setClients] = useState<ClientJour[]>([]);

  useEffect(() => {
    if (!date) {
      return;
    }
    listerClientsDuJour(date)
      .then(setClients)
      .catch((error) => {
        console.error(`Erreur lors du chargement des clients du ${date} :`, error);
      });
  }, [date]);

  const [annee, mois, jour] = (date ?? '').split('-').map(Number);
  const dateLibelle =
    date && !Number.isNaN(annee)
      ? new Date(annee, mois - 1, jour).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : date ?? '';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContenu,
          { paddingBottom: theme.spacing.xl + insets.bottom },
        ]}>
        <View style={styles.texteBlock}>
          <Text style={styles.texteLabel}>Journée importée</Text>
          <Text style={styles.texteTitre}>{dateLibelle}</Text>
          <Text style={styles.texteCompte}>
            {clients.length} client{clients.length > 1 ? 's' : ''}
          </Text>
        </View>

        {clients.length === 0 ? (
          <View style={styles.vide}>
            <MaterialCommunityIcons name="account-off" size={40} color={theme.colors.outline} />
            <Text style={styles.videTexte}>Aucun client pour cette journée.</Text>
          </View>
        ) : (
          clients.map((client) => {
            const statut = libelleStatut(client.statut);
            return (
              <View key={client.id} style={styles.carte}>
                <View style={styles.carteGauche}>
                  <Text style={styles.carteNom}>{client.nom}</Text>
                  <Text style={styles.carteDetail}>{client.kg} kg</Text>
                </View>
                <View style={styles.carteDroite}>
                  <Text style={[styles.carteStatut, { color: statut.couleur }]}>
                    {statut.texte}
                  </Text>
                  {client.montant !== null ? (
                    <Text style={styles.carteMontant}>
                      {client.montant} {client.modePaiement === 'Kpk' ? 'Kpk' : 'Ar'}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContenu: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    texteBlock: {
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    texteLabel: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    texteTitre: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineMd,
      color: theme.colors.onSurface,
    },
    texteCompte: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
    },
    vide: {
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.xl,
    },
    videTexte: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    carte: {
      backgroundColor: theme.colors.surfaceContainer,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    carteGauche: {
      flex: 1,
      gap: 2,
    },
    carteNom: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurface,
    },
    carteDetail: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
    },
    carteDroite: {
      alignItems: 'flex-end',
      gap: 2,
    },
    carteStatut: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
    },
    carteMontant: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurface,
    },
  });
}
