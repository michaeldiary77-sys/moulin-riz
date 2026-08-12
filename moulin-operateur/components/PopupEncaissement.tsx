import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { FilledButton, TextButton } from '@/components/ui/material';
import { encaisserClient } from '@/lib/db/clients';
import { lireTarifs } from '@/lib/db/tarifs';
import { useAppTheme } from '@/lib/theme/useAppTheme';

const AR_PAR_KG_DEFAUT = 100;
const AR_PAR_KPK_DEFAUT = 500;

type ModePaiement = 'Ar' | 'Kpk';

/**
 * Popup de paiement (étape 2) : affiche les deux montants (Ar et Kpk)
 * dès l'ouverture. Le clic sur un mode de paiement déclenche la
 * confirmation puis l'encaissement (toujours statut 'paye'). Un client
 * non payé passe uniquement par la clôture automatique de fin de journée.
 */
export function PopupEncaissement({
  visible,
  client,
  onFerme,
  onEncaisse,
}: {
  visible: boolean;
  client: { id: string; nom: string; kg: number } | null;
  onFerme: () => void;
  onEncaisse: () => void;
}) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [arParKg, setArParKg] = useState(AR_PAR_KG_DEFAUT);
  const [arParKpk, setArParKpk] = useState(AR_PAR_KPK_DEFAUT);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (visible && client) {
      setErreur(null);
    }
    lireTarifs()
      .then((tarifs) => {
        if (tarifs) {
          setArParKg(tarifs.arParKg);
          setArParKpk(tarifs.arParKpk);
        }
      })
      .catch((error) => {
        console.error('Erreur lors de la lecture des tarifs :', error);
      });
  }, [visible, client]);

  if (!client) {
    return null;
  }

  const clientCourant = client;
  const montantAr = clientCourant.kg * arParKg;
  const montantKpk = Math.round((montantAr / arParKpk) * 100) / 100;

  function confirmerEtEncaisser(modePaiement: ModePaiement, montantAffiche: string) {
    Alert.alert(
      'Confirmation',
      `Confirmer le paiement de ${montantAffiche} pour ${clientCourant.nom} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => encaisser(modePaiement, montantAffiche) },
      ],
    );
  }

  async function encaisser(modePaiement: ModePaiement, montantAffiche: string) {
    const montant = modePaiement === 'Ar' ? montantAr : montantKpk;
    try {
      await encaisserClient({
        id: clientCourant.id,
        modePaiement,
        montant,
        statut: 'paye',
      });
    } catch (error) {
      setErreur(error instanceof Error ? error.message : String(error));
      return;
    }
    onEncaisse();
    onFerme();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFerme}>
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <Text style={styles.title}>Paiement : {clientCourant.nom}</Text>

          <Text style={styles.label}>Montant en Ar</Text>
          <Text style={styles.montant}>{montantAr} Ar</Text>

          <Text style={styles.label}>Montant en Kpk</Text>
          <Text style={styles.montant}>{montantKpk} Kpk</Text>

          <Text style={styles.label}>Choisir le mode de paiement</Text>
          <FilledButton
            label="Payer en Ar"
            onPress={() => confirmerEtEncaisser('Ar', `${montantAr} Ar`)}
          />
          <FilledButton
            label="Payer en Kpk"
            onPress={() => confirmerEtEncaisser('Kpk', `${montantKpk} Kpk`)}
          />

          {erreur && <Text style={styles.erreur}>{erreur}</Text>}

          <View style={styles.actions}>
            <TextButton label="Annuler" onPress={onFerme} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.scrim,
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    popup: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
      ...theme.elevation.fab,
    },
    title: {
      fontSize: theme.fontSizes.headlineSm,
      fontFamily: theme.fontFamilies.headline,
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.sm,
    },
    label: {
      fontSize: theme.fontSizes.labelMd,
      fontFamily: theme.fontFamilies.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.sm,
    },
    montant: {
      fontSize: theme.fontSizes.headlineMd,
      fontFamily: theme.fontFamilies.headlineSemiBold,
      color: theme.colors.onSurface,
    },
    erreur: {
      color: theme.colors.error,
      fontSize: theme.fontSizes.labelMd,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
  });
}
