import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { PopupAjouterDette } from '@/components/PopupAjouterDette';
import { listerDettes, type Dette } from '@/lib/db/dettes';
import { useAppTheme } from '@/lib/theme/useAppTheme';

/**
 * Écran "Gestion des Dettes" : total net des dettes, nombre de clients
 * concernés, dernier mouvement et historique complet du journal. Un FAB
 * ouvre le popup d'ajout manuel d'une dette (Dette+ / Dette-).
 */
export default function DettesScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation();
  const [dettes, setDettes] = useState<Dette[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [popupVisible, setPopupVisible] = useState(false);

  useEffect(() => {
    listerDettes()
      .then(setDettes)
      .catch((error) => {
        console.error('Erreur lors du chargement des dettes :', error);
      });
  }, [refreshKey]);

  const totalNet = dettes.reduce((somme, dette) => {
    return dette.type === 'dette_plus' ? somme + dette.montant : somme - dette.montant;
  }, 0);

  const nombreClientsDistincts = new Set(dettes.map((dette) => dette.clientNom)).size;

  let derniereDette: Dette | null = null;
  for (const dette of dettes) {
    if (!derniereDette || dette.seq > derniereDette.seq) {
      derniereDette = dette;
    }
  }

  function tempsEcoule(createdAt: string): string {
    const ecartMin = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    if (ecartMin < 60) {
      return `il y a ${ecartMin} min`;
    }
    const heures = Math.floor(ecartMin / 60);
    return `il y a ${heures} h`;
  }

  function heureAffichee(createdAt: string): string {
    return new Date(createdAt).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const dettesRecentAvant = [...dettes].reverse();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerGauche}>
            <Pressable onPress={() => (navigation as any).openDrawer()}>
              <MaterialCommunityIcons name="menu" size={28} color={theme.colors.primary} />
            </Pressable>
            <View style={styles.headerCercle}>
              <MaterialCommunityIcons name="account-cash" size={28} color={theme.colors.onPrimary} />
            </View>
          </View>
          <Text style={styles.headerTitre}>Gestion des Dettes</Text>
          <View style={styles.switchButton}>
            <Text style={styles.switchText}>Switch</Text>
          </View>
        </View>

        <View style={styles.carte}>
          <Text style={styles.carteLibelle}>TOTAL DETTES</Text>
          <Text
            style={[
              styles.totalNet,
              { color: totalNet > 0 ? theme.colors.error : theme.colors.success },
            ]}>
            {totalNet} Ar
          </Text>
        </View>

        <View style={styles.carte}>
          <Text style={styles.carteLibelle}>MOUVEMENTS RÉCENTS</Text>
          <Text style={styles.carteValeur}>{nombreClientsDistincts} Clients</Text>
          <Text style={styles.carteDetail}>
            {derniereDette
              ? `Dernier : ${tempsEcoule(derniereDette.createdAt)}`
              : 'Aucun mouvement'}
          </Text>
        </View>

        <View style={styles.historiqueHeader}>
          <Text style={styles.historiqueTitre}>Historique</Text>
          <Text style={styles.historiqueCompte}>{dettes.length} mouvements</Text>
        </View>

        {dettes.length === 0 ? (
          <Text style={styles.vide}>Aucune dette enregistrée</Text>
        ) : (
          dettesRecentAvant.map((dette) => (
            <View
              key={dette.id}
              style={[
                styles.ligneCarte,
                {
                  borderLeftColor:
                    dette.type === 'dette_plus' ? theme.colors.error : theme.colors.success,
                },
              ]}>
              <View style={styles.ligneGauche}>
                <Text style={styles.ligneNom}>{dette.clientNom}</Text>
                {dette.motif ? <Text style={styles.ligneMotif}>{dette.motif}</Text> : null}
                <View style={styles.ligneBadge}>
                  <Text style={styles.ligneBadgeText}>
                    {dette.origine === 'auto' ? 'AUTO' : 'MANUEL'}
                  </Text>
                </View>
              </View>
              <View style={styles.ligneDroite}>
                <Text
                  style={[
                    styles.ligneMontant,
                    {
                      color:
                        dette.type === 'dette_plus' ? theme.colors.error : theme.colors.success,
                    },
                  ]}>
                  {dette.type === 'dette_plus' ? '+' : '-'}
                  {dette.montant} Ar
                </Text>
                <Text style={styles.ligneHeure}>{heureAffichee(dette.createdAt)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setPopupVisible(true)}>
        <MaterialCommunityIcons name="plus" size={32} color={theme.colors.onPrimary} />
      </Pressable>

      <PopupAjouterDette
        visible={popupVisible}
        onFermer={() => setPopupVisible(false)}
        onAjoutReussi={() => setRefreshKey((k) => k + 1)}
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
    content: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
    },
    headerGauche: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    headerCercle: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitre: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineSm,
      color: theme.colors.primary,
    },
    switchButton: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    switchText: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
    },
    carte: {
      backgroundColor: theme.colors.surfaceContainerHigh,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.xs,
    },
    carteLibelle: {
      fontFamily: theme.fontFamilies.mono,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    totalNet: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineLg,
    },
    carteValeur: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineMd,
      color: theme.colors.onSurface,
    },
    carteDetail: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
    },
    historiqueHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    historiqueTitre: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineSm,
      color: theme.colors.onSurface,
    },
    historiqueCompte: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
    },
    vide: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      paddingVertical: theme.spacing.xl,
    },
    ligneCarte: {
      backgroundColor: theme.colors.surfaceContainer,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      borderLeftWidth: 3,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    ligneGauche: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    ligneNom: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurface,
    },
    ligneMotif: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
    },
    ligneBadge: {
      alignSelf: 'flex-start',
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceContainerHigh,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    ligneBadgeText: {
      fontFamily: theme.fontFamilies.mono,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    ligneDroite: {
      alignItems: 'flex-end',
      gap: theme.spacing.xs,
    },
    ligneMontant: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.bodyMd,
    },
    ligneHeure: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
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
