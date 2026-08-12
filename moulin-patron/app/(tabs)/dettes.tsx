import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/ui/material';
import { listerDettes, listerIdsCorrections, type Dette } from '@/lib/db/dettes';
import { useAppTheme } from '@/lib/theme/useAppTheme';

function dateHeureAffichee(createdAt: string): string {
  const d = new Date(createdAt);
  const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${heure}`;
}

export default function DettesScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const [dettes, setDettes] = useState<Dette[]>([]);
  const [corrigees, setCorrigees] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      Promise.all([listerDettes(), listerIdsCorrections()])
        .then(([liste, ids]) => {
          setDettes(liste);
          setCorrigees(new Set(ids));
        })
        .catch((error) => {
          console.error('Erreur lors du chargement des dettes :', error);
        });
    }, []),
  );

  const actives = dettes.filter((d) => d.remboursee === 0 && !corrigees.has(d.id));
  const totalARecevoir = actives
    .filter((d) => d.type === 'dette_plus')
    .reduce((somme, d) => somme + d.montant, 0);
  const totalAPayer = actives
    .filter((d) => d.type === 'dette_moins')
    .reduce((somme, d) => somme + d.montant, 0);

  const dettesRecentAvant = [...dettes].reverse();

  return (
    <View style={styles.container}>
      <AppBar title="Dettes" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContenu,
          { paddingBottom: theme.spacing.xl + insets.bottom },
        ]}>
        <View style={styles.statsRow}>
          <View style={styles.statCarte}>
            <Text style={styles.statLibelle}>À RECEVOIR</Text>
            <Text style={[styles.statTotal, { color: theme.colors.success }]}>
              {totalARecevoir} Ar
            </Text>
          </View>
          <View style={styles.statCarte}>
            <Text style={styles.statLibelle}>À PAYER</Text>
            <Text style={[styles.statTotal, { color: theme.colors.error }]}>
              {totalAPayer} Ar
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitre}>Historique</Text>
        {dettes.length === 0 ? (
          <View style={styles.vide}>
            <MaterialCommunityIcons name="cash-off" size={40} color={theme.colors.outline} />
            <Text style={styles.videTexte}>
              Aucune dette importée. Importez le journal des dettes depuis l&apos;onglet Sync.
            </Text>
          </View>
        ) : (
          dettesRecentAvant.map((dette) => {
            const estPlus = dette.type === 'dette_plus';
            const couleur = estPlus ? theme.colors.success : theme.colors.error;
            const estCorrigee = corrigees.has(dette.id);
            return (
              <View
                key={dette.id}
                style={[
                  styles.carte,
                  { borderLeftColor: couleur },
                  (dette.remboursee === 1 || estCorrigee) && styles.carteRemboursee,
                ]}>
                <View style={styles.carteGauche}>
                  <Text style={styles.carteNom}>{dette.clientNom}</Text>
                  {dette.motif ? <Text style={styles.carteMotif}>{dette.motif}</Text> : null}
                  <View style={styles.carteBadge}>
                    <Text style={styles.carteBadgeTexte}>
                      {dette.origine === 'auto' ? 'AUTO' : 'MANUEL'}
                    </Text>
                  </View>
                  <Text style={styles.carteHeure}>{dateHeureAffichee(dette.createdAt)}</Text>
                </View>
                <View style={styles.carteDroite}>
                  <Text style={[styles.carteMontant, { color: couleur }]}>
                    {estPlus ? '+' : '-'}
                    {dette.montant} Ar
                  </Text>
                  {estCorrigee ? (
                    <Text style={styles.carteCorrigeeTexte}>Annulée</Text>
                  ) : dette.remboursee === 1 ? (
                    <Text style={styles.carteRembourseeTexte}>Remboursée</Text>
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
    statsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    statCarte: {
      flex: 1,
      backgroundColor: theme.colors.surfaceContainerHigh,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    statLibelle: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    statTotal: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineSm,
    },
    sectionTitre: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.xs,
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
      borderLeftWidth: 3,
    },
    carteRemboursee: {
      opacity: 0.6,
    },
    carteGauche: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    carteNom: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurface,
    },
    carteMotif: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
    },
    carteBadge: {
      alignSelf: 'flex-start',
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceContainerHigh,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    carteBadgeTexte: {
      fontFamily: theme.fontFamilies.mono,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    carteHeure: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    carteDroite: {
      alignItems: 'flex-end',
      gap: theme.spacing.xs,
    },
    carteMontant: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.bodyMd,
    },
    carteRembourseeTexte: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.success,
    },
    carteCorrigeeTexte: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.error,
    },
  });
}
