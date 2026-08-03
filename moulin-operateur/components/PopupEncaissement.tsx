import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

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
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <Text style={styles.title}>Paiement : {clientCourant.nom}</Text>

          <Text style={styles.label}>Montant en Ar</Text>
          <Text style={styles.montant}>{montantAr} Ar</Text>

          <Text style={styles.label}>Montant en Kpk</Text>
          <Text style={styles.montant}>{montantKpk} Kpk</Text>

          <Text style={styles.label}>Choisir le mode de paiement</Text>
          <Pressable
            style={[styles.button, { borderColor: theme.colors.ar }]}
            onPress={() => confirmerEtEncaisser('Ar', `${montantAr} Ar`)}>
            <Text style={styles.buttonText}>Payer en Ar</Text>
          </Pressable>
          <Pressable
            style={[styles.button, { borderColor: theme.colors.kpk }]}
            onPress={() => confirmerEtEncaisser('Kpk', `${montantKpk} Kpk`)}>
            <Text style={styles.buttonText}>Payer en Kpk</Text>
          </Pressable>

          {erreur && <Text style={styles.erreur}>{erreur}</Text>}

          <Pressable style={styles.buttonAnnuler} onPress={onFerme}>
            <Text style={styles.buttonText}>Annuler</Text>
          </Pressable>
        </View>
      </View>
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
    label: {
      fontSize: theme.fontSizes.bodyMd,
      fontFamily: theme.fontFamilies.body,
      color: theme.colors.onSurface,
      marginTop: theme.spacing.sm,
    },
    montant: {
      fontSize: theme.fontSizes.headlineMd,
      fontFamily: theme.fontFamilies.headlineSemiBold,
      color: theme.colors.primary,
      textAlign: 'center',
    },
    button: {
      backgroundColor: theme.colors.primary,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      marginTop: theme.spacing.sm,
      borderWidth: 2,
    },
    buttonText: {
      fontSize: theme.fontSizes.bodyMd,
      fontFamily: theme.fontFamilies.bodyMedium,
      color: theme.colors.onPrimary,
    },
    erreur: {
      color: theme.colors.error,
      fontSize: theme.fontSizes.bodyMd,
    },
    buttonAnnuler: {
      backgroundColor: theme.colors.surfaceContainerHigh,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
  });
}
