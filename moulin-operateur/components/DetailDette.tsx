import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { rembourserDette, supprimerDette, type Dette } from '@/lib/db/dettes';
import { useAppTheme } from '@/lib/theme/useAppTheme';

function formaterDateHeure(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${date} à ${heure}`;
}

/**
 * Détail d'un mouvement de dette. Le bouton "Rembourser" apparaît pour
 * toute dette (Dette+ ou Dette-) non encore remboursée ; le remboursement
 * se fait en une fois, montant entier, avec confirmation. Un bouton
 * "Annuler la dette" (optionnel, utilisé sur l'écran Dettes) permet de
 * corriger une dette saisie par erreur : il ajoute un contre-mouvement au
 * journal (la dette reste visible mais annulée, ce qui se propage à l'autre
 * téléphone lors de la synchronisation). Une fois payée ou annulée, la carte
 * devient non cliquable depuis la liste, donc ce détail n'est plus
 * atteignable.
 */
export function DetailDette({
  visible,
  dette,
  onFermer,
  onRembourse,
  onSupprime,
}: {
  visible: boolean;
  dette: Dette | null;
  onFermer: () => void;
  onRembourse: () => void;
  onSupprime?: () => void;
}) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);

  async function rembourser() {
    if (!dette) {
      return;
    }
    const message =
      dette.type === 'dette_plus'
        ? `${dette.clientNom} rembourse ${dette.montant} Ar au moulin (argent entrant) ?`
        : `Rembourser ${dette.montant} Ar à ${dette.clientNom} (argent sortant) ?`;
    Alert.alert('Confirmer le remboursement', message, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rembourser',
        style: 'destructive',
        onPress: async () => {
          try {
            const remboursee = await rembourserDette(dette.id);
            if (remboursee) {
              onRembourse();
              onFermer();
            } else {
              Alert.alert(
                'Déjà remboursée',
                'Cette dette a déjà été remboursée. La liste a été rafraîchie.',
                [{ text: 'OK' }],
              );
            }
          } catch (error) {
            Alert.alert(
              'Erreur',
              error instanceof Error ? error.message : String(error),
            );
          }
        },
      },
    ]);
  }

  async function supprimer() {
    if (!dette) {
      return;
    }
    Alert.alert(
      'Confirmer l\u2019annulation',
      `Annuler la dette de ${dette.montant} Ar pour ${dette.clientNom} ? Un contre-mouvement sera ajouté au journal pour la neutraliser (elle restera visible comme annulée).`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Annuler la dette',
          style: 'destructive',
          onPress: async () => {
            try {
              await supprimerDette(dette.id);
              onSupprime?.();
              onFermer();
            } catch (error) {
              Alert.alert(
                'Erreur',
                error instanceof Error ? error.message : String(error),
              );
            }
          },
        },
      ],
    );
  }

  const estRemboursable = dette?.remboursee === 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onFermer}>
        <Pressable onPress={() => {}}>
          <View style={styles.popup}>
            <Text style={styles.title}>Détail de la dette</Text>

            <View style={styles.ligne}>
              <Text style={styles.label}>Client</Text>
              <Text style={styles.valeur}>{dette?.clientNom ?? ''}</Text>
            </View>
            <View style={styles.ligne}>
              <Text style={styles.label}>Montant</Text>
              <Text style={styles.valeur}>
                {dette ? `${dette.montant} Ar` : ''}
              </Text>
            </View>
            <View style={styles.ligne}>
              <Text style={styles.label}>Type</Text>
              <Text style={styles.valeur}>
                {dette?.type === 'dette_plus' ? 'Dette+' : 'Dette-'}
              </Text>
            </View>
            <View style={styles.ligne}>
              <Text style={styles.label}>Origine</Text>
              <Text style={styles.valeur}>
                {dette?.origine === 'auto' ? 'Automatique' : 'Manuelle'}
              </Text>
            </View>
            {dette?.motif ? (
              <View style={styles.ligne}>
                <Text style={styles.label}>Motif</Text>
                <Text style={styles.valeur}>{dette.motif}</Text>
              </View>
            ) : null}
            <View style={styles.ligne}>
              <Text style={styles.label}>Créée le</Text>
              <Text style={styles.valeur}>
                {dette ? formaterDateHeure(dette.createdAt) : ''}
              </Text>
            </View>
            <View style={styles.ligne}>
              <Text style={styles.label}>Statut</Text>
              {dette?.remboursee === 1 ? (
                <Text style={[styles.valeur, styles.statutRemboursee]}>
                  Remboursée{dette.rembourseeAt ? ` le ${formaterDateHeure(dette.rembourseeAt)}` : ''}
                </Text>
              ) : (
                <Text style={[styles.valeur, styles.statutEnAttente]}>
                  En attente de remboursement
                </Text>
              )}
            </View>

            {estRemboursable ? (
              <Pressable style={styles.button} onPress={rembourser}>
                <Text style={styles.buttonText}>Rembourser</Text>
              </Pressable>
            ) : null}

            {onSupprime && dette ? (
              <Pressable style={styles.buttonSupprimer} onPress={supprimer}>
                <Text style={styles.buttonSupprimerText}>Supprimer</Text>
              </Pressable>
            ) : null}

            <Pressable style={styles.buttonAnnuler} onPress={onFermer}>
              <Text style={styles.buttonAnnulerText}>Fermer</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    popup: {
      backgroundColor: theme.colors.surfaceContainer,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    title: {
      fontSize: theme.fontSizes.headlineSm,
      fontFamily: theme.fontFamilies.headline,
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    ligne: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    label: {
      fontSize: theme.fontSizes.bodyMd,
      fontFamily: theme.fontFamilies.body,
      color: theme.colors.onSurfaceVariant,
    },
    valeur: {
      flex: 1,
      textAlign: 'right',
      fontSize: theme.fontSizes.bodyMd,
      fontFamily: theme.fontFamilies.bodyMedium,
      color: theme.colors.onSurface,
    },
    statutEnAttente: {
      color: theme.colors.warning,
    },
    statutRemboursee: {
      color: theme.colors.success,
    },
    button: {
      backgroundColor: theme.colors.primary,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    buttonText: {
      fontSize: theme.fontSizes.bodyMd,
      fontFamily: theme.fontFamilies.bodyMedium,
      color: theme.colors.onPrimary,
    },
    buttonSupprimer: {
      backgroundColor: theme.colors.surfaceContainerHigh,
      borderWidth: 1,
      borderColor: theme.colors.error,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    buttonSupprimerText: {
      fontSize: theme.fontSizes.bodyMd,
      fontFamily: theme.fontFamilies.bodyMedium,
      color: theme.colors.error,
    },
    buttonAnnuler: {
      backgroundColor: theme.colors.surfaceContainerHigh,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    buttonAnnulerText: {
      fontSize: theme.fontSizes.bodyMd,
      fontFamily: theme.fontFamilies.body,
      color: theme.colors.onSurfaceVariant,
    },
  });
}
