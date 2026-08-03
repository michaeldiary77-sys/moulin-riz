import { useRef, useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ajouterDette } from '@/lib/db/dettes';
import { useStabiliteClavier } from '@/lib/hooks/useStabiliteClavier';
import { useAppTheme } from '@/lib/theme/useAppTheme';

type TypeDette = 'dette_plus' | 'dette_moins';

/**
 * Popup d'ajout manuel d'un mouvement de dette (Dette+ / Dette-),
 * toujours avec origine "manuel" (les Dette+ automatiques passent par
 * cloturerJoursPrecedents(), pas par ce popup).
 */
export function PopupAjouterDette({
  visible,
  onFermer,
  onAjoutReussi,
}: {
  visible: boolean;
  onFermer: () => void;
  onAjoutReussi: () => void;
}) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [type, setType] = useState<TypeDette>('dette_plus');
  const [nom, setNom] = useState('');
  const [montant, setMontant] = useState('');
  const [motif, setMotif] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const nomRef = useRef<TextInput>(null);
  const montantRef = useRef<TextInput>(null);
  const motifRef = useRef<TextInput>(null);
  useStabiliteClavier([nomRef, montantRef, motifRef], visible);

  function fermer() {
    setType('dette_plus');
    setNom('');
    setMontant('');
    setMotif('');
    setErreur(null);
    onFermer();
  }

  async function handleEnregistrer() {
    const nomNettoye = nom.trim();
    const montantNum = Number(montant);
    if (!nomNettoye) {
      setErreur('Le nom du client ne doit pas être vide.');
      return;
    }
    if (!Number.isFinite(montantNum) || montantNum <= 0) {
      setErreur('Le montant doit être un nombre supérieur à 0.');
      return;
    }
    const motifNettoye = motif.trim();
    try {
      await ajouterDette({
        clientNom: nomNettoye,
        type,
        montant: montantNum,
        motif: motifNettoye ? motifNettoye : null,
        origine: 'manuel',
        correctionDe: null,
      });
      setType('dette_plus');
      setNom('');
      setMontant('');
      setMotif('');
      setErreur(null);
      onAjoutReussi();
      onFermer();
    } catch (error) {
      setErreur(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={Keyboard.dismiss}>
        <Pressable onPress={() => {}}>
          <View style={styles.popup}>
            <Text style={styles.title}>Ajouter une dette</Text>

            <View style={styles.typeRow}>
              <Pressable
                style={[styles.typeButton, type === 'dette_plus' && styles.typeButtonPlusActif]}
                onPress={() => setType('dette_plus')}>
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'dette_plus' && styles.typeButtonTextPlusActif,
                  ]}>
                  Dette+
                </Text>
              </Pressable>
              <Pressable
                style={[styles.typeButton, type === 'dette_moins' && styles.typeButtonMoinsActif]}
                onPress={() => setType('dette_moins')}>
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'dette_moins' && styles.typeButtonTextMoinsActif,
                  ]}>
                  Dette-
                </Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Nom du client</Text>
            <TextInput style={styles.input} value={nom} onChangeText={setNom} ref={nomRef} />

            <Text style={styles.label}>Montant</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={montant}
              onChangeText={setMontant}
              ref={montantRef}
            />

            <Text style={styles.label}>Motif (optionnel)</Text>
            <TextInput style={styles.input} value={motif} onChangeText={setMotif} ref={motifRef} />

            {erreur && <Text style={styles.erreur}>{erreur}</Text>}

            <Pressable style={styles.button} onPress={handleEnregistrer}>
              <Text style={styles.buttonText}>Enregistrer</Text>
            </Pressable>
            <Pressable style={styles.buttonAnnuler} onPress={fermer}>
              <Text style={styles.buttonText}>Annuler</Text>
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
    typeRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    typeButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      backgroundColor: 'transparent',
      alignItems: 'center',
    },
    typeButtonPlusActif: {
      backgroundColor: theme.colors.error,
      borderColor: theme.colors.error,
    },
    typeButtonMoinsActif: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    typeButtonText: {
      fontSize: theme.fontSizes.bodyMd,
      fontFamily: theme.fontFamilies.body,
      color: theme.colors.onSurfaceVariant,
    },
    typeButtonTextPlusActif: {
      color: theme.colors.onPrimary,
    },
    typeButtonTextMoinsActif: {
      color: theme.colors.onPrimary,
    },
    label: {
      fontSize: theme.fontSizes.bodyMd,
      fontFamily: theme.fontFamilies.body,
      color: theme.colors.onSurface,
      marginTop: theme.spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      fontSize: theme.fontSizes.bodyMd,
      fontFamily: theme.fontFamilies.body,
      color: theme.colors.onSurface,
    },
    erreur: {
      color: theme.colors.error,
      fontSize: theme.fontSizes.bodyMd,
    },
    button: {
      backgroundColor: theme.colors.primary,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    buttonAnnuler: {
      backgroundColor: theme.colors.surfaceContainerHigh,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    buttonText: {
      fontSize: theme.fontSizes.bodyMd,
      fontFamily: theme.fontFamilies.body,
      color: theme.colors.onPrimary,
    },
  });
}
