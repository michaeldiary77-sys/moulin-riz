import { useRef, useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ajouterClient } from '@/lib/db/clients';
import { useStabiliteClavier } from '@/lib/hooks/useStabiliteClavier';
import { dateDuJourLocal } from '@/lib/utils/date';
import { useAppTheme } from '@/lib/theme/useAppTheme';

/**
 * Popup d'accueil d'un client (étape 1) : nom et kg uniquement.
 * La création se fait avec le statut "en_attente" ; l'encaissement
 * (étape 2) se fera plus tard dans une tâche séparée.
 */
export function PopupNouveauClient({
  visible,
  profilNom,
  onFerme,
  onClientAjoute,
}: {
  visible: boolean;
  profilNom: string | null;
  onFerme: () => void;
  onClientAjoute: () => void;
}) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [nom, setNom] = useState('');
  const [kg, setKg] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const nomRef = useRef<TextInput>(null);
  const kgRef = useRef<TextInput>(null);
  useStabiliteClavier([nomRef, kgRef], visible);

  function fermer() {
    setNom('');
    setKg('');
    setErreur(null);
    onFerme();
  }

  async function handleAjouter() {
    const nomNettoye = nom.trim();
    const kgNum = Number(kg);
    if (!nomNettoye) {
      setErreur('Le nom du client ne doit pas être vide.');
      return;
    }
    if (!Number.isFinite(kgNum) || kgNum <= 0) {
      setErreur('Le poids (kg) doit être un nombre supérieur à 0.');
      return;
    }
    try {
      await ajouterClient({
        date: dateDuJourLocal(),
        nom: nomNettoye,
        kg: kgNum,
        profilNom,
      });
      setNom('');
      setKg('');
      setErreur(null);
      onClientAjoute();
      onFerme();
    } catch (error) {
      setErreur(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={Keyboard.dismiss}>
        <Pressable onPress={() => {}}>
          <View style={styles.popup}>
            <Text style={styles.title}>Nouveau client</Text>

            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={styles.input}
              value={nom}
              onChangeText={setNom}
              ref={nomRef}
            />

            <Text style={styles.label}>Kg apportés</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={kg}
              onChangeText={setKg}
              ref={kgRef}
            />

            {erreur && <Text style={styles.erreur}>{erreur}</Text>}

            <Pressable style={styles.button} onPress={handleAjouter}>
              <Text style={styles.buttonText}>Ajouter</Text>
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
