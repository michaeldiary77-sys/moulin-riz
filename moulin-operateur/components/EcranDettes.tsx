import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';


import { DetailDette } from '@/components/DetailDette';
import { PopupAjouterDette } from '@/components/PopupAjouterDette';
import { AppBar, androidRipple } from '@/components/ui/material';
import { listerDettes, listerIdsCorrections, type Dette } from '@/lib/db/dettes';
import { useAppTheme } from '@/lib/theme/useAppTheme';

type TypeDette = 'dette_plus' | 'dette_moins';

/**
 * Écran dédié à un type de dette : Dette+ (À RECEVOIR, argent entrant au
 * remboursement) ou Dette- (À PAYER, argent sortant au remboursement).
 * L'en-tête, le total des dettes actives de ce type, le nombre de clients
 * concernés et le dernier mouvement sont fixes ; seule la liste de
 * l'historique défile (comme la liste des clients). Le FAB ouvre le popup
 * d'ajout avec le type de l'écran imposé. Une dette remboursée est
 * verrouillée (carte non cliquable) ; une dette active peut être remboursée
 * ou supprimée depuis son détail.
 */
export function EcranDettes({ type }: { type: TypeDette }) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [dettes, setDettes] = useState<Dette[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [popupVisible, setPopupVisible] = useState(false);
  const [detteDetail, setDetteDetail] = useState<Dette | null>(null);
  const [corrigees, setCorrigees] = useState<Set<string>>(new Set());

  // Même mécanisme que l'Accueil : chaque nouvelle action (ajout, remboursement,
  // suppression) ou retour au focus incrémente refreshKey, et le useEffect
  // ci-dessous recharge la liste immédiatement.
  useEffect(() => {
    Promise.all([listerDettes(), listerIdsCorrections()])
      .then(([liste, ids]) => {
        setDettes(liste);
        setCorrigees(new Set(ids));
      })
      .catch((error) => {
        console.error('Erreur lors du chargement des dettes :', error);
      });
  }, [refreshKey]);

  // Retour au focus (ex. remboursement fait depuis l'Accueil) : on recharge.
  useFocusEffect(
    useCallback(() => {
      setRefreshKey((k) => k + 1);
    }, []),
  );

  const estPlus = type === 'dette_plus';
  const titre = estPlus ? 'Dette+' : 'Dette-';
  const libelleTotal = estPlus ? 'À RECEVOIR' : 'À PAYER';
  const couleurTotal = estPlus ? theme.colors.success : theme.colors.error;
  const messageVide = estPlus ? 'Aucune Dette+ enregistrée' : 'Aucune Dette- enregistrée';

  const dettesDuType = dettes.filter((d) => d.type === type);
  const actives = dettesDuType.filter((d) => !corrigees.has(d.id));

  const total = actives.reduce(
    (somme, dette) => (dette.remboursee === 0 ? somme + dette.montant : somme),
    0,
  );

  const clientsConcernes = new Set(
    actives.filter((d) => d.remboursee === 0).map((dette) => dette.clientNom),
  ).size;

  let derniereDette: Dette | null = null;
  for (const dette of dettesDuType) {
    if (!derniereDette || dette.createdAt > derniereDette.createdAt) {
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

  const dettesRecentAvant = [...dettesDuType].reverse();

  return (
    <View style={styles.container}>
      <AppBar title={titre} />

      <View style={styles.blocStats}>
        <View style={styles.carte}>
          <Text style={styles.carteLibelle}>{libelleTotal}</Text>
          <Text style={[styles.total, { color: couleurTotal }]}>{total} Ar</Text>
          <Text style={styles.carteDetail}>
            {clientsConcernes} client{clientsConcernes > 1 ? 's' : ''} concerné
            {clientsConcernes > 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.carte}>
          <Text style={styles.carteLibelle}>MOUVEMENTS RÉCENTS</Text>
          <Text style={styles.carteDetail}>
            {derniereDette
              ? `Dernier : ${tempsEcoule(derniereDette.createdAt)}`
              : 'Aucun mouvement'}
          </Text>
        </View>

        <View style={styles.historiqueHeader}>
          <Text style={styles.historiqueTitre}>Historique</Text>
          <Text style={styles.historiqueCompte}>{dettesDuType.length} mouvements</Text>
        </View>
      </View>

      <ScrollView style={styles.listeScroll} contentContainerStyle={styles.listeContenu}>
        {dettesDuType.length === 0 ? (
          <Text style={styles.vide}>{messageVide}</Text>
        ) : (
          dettesRecentAvant.map((dette) => {
            const estCorrigee = corrigees.has(dette.id);
            return (
            <Pressable
              key={dette.id}
              disabled={dette.remboursee === 1 || estCorrigee}
              onPress={() => setDetteDetail(dette)}
              style={[
                styles.ligneCarte,
                { borderLeftColor: couleurTotal },
                (dette.remboursee === 1 || estCorrigee) && styles.carteRemboursee,
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
                <Text style={[styles.ligneMontant, { color: couleurTotal }]}>
                  {estPlus ? '+' : '-'}
                  {dette.montant} Ar
                </Text>
                <Text style={styles.ligneHeure}>{heureAffichee(dette.createdAt)}</Text>
                {estCorrigee ? (
                  <Text style={styles.ligneCorrigee}>Annulée</Text>
                ) : dette.remboursee === 1 ? (
                  <Text style={styles.ligneRemboursee}>Remboursée</Text>
                ) : null}
              </View>
            </Pressable>
            );
          })
        )}
      </ScrollView>

      <Pressable
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Ajouter une dette"
        android_ripple={androidRipple(theme.colors.ripple, true)}
        onPress={() => setPopupVisible(true)}>
        <MaterialCommunityIcons name="plus" size={28} color={theme.colors.onPrimary} />
      </Pressable>

      <PopupAjouterDette
        visible={popupVisible}
        typeDette={type}
        onFermer={() => setPopupVisible(false)}
        onAjoutReussi={() => setRefreshKey((k) => k + 1)}
      />

      <DetailDette
        visible={detteDetail !== null}
        dette={detteDetail}
        onFermer={() => setDetteDetail(null)}
        onRembourse={() => setRefreshKey((k) => k + 1)}
        onSupprime={() => setRefreshKey((k) => k + 1)}
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
    blocStats: {
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.md,
    },
    carte: {
      backgroundColor: theme.colors.surfaceContainerHigh,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.xs,
    },
    carteLibelle: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    total: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineLg,
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
    listeScroll: {
      flex: 1,
    },
    listeContenu: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
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
      marginBottom: theme.spacing.sm,
    },
    carteRemboursee: {
      opacity: 0.6,
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
      fontFamily: theme.fontFamilies.bodyMedium,
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
    ligneRemboursee: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.success,
    },
    ligneCorrigee: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.error,
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
    },
  });
}
