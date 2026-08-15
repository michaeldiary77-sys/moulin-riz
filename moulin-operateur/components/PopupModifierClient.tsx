import { useEffect, useRef, useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FilledButton, TextButton } from '@/components/ui/material';
import { modifierClient, type ClientJour } from '@/lib/db/clients';
import { useStabiliteClavier } from '@/lib/hooks/useStabiliteClavier';
import { useAppTheme } from '@/lib/theme/useAppTheme';

/**
 * Popup de modification d'un client "en attente" : nom et kg, pré-remplis
 * avec les valeurs actuelles. Reprend l'habillage de PopupNouveauClient.
 */
export function PopupModifierClient({
  visible,
  client,
  onFermer,
  onModifieReussi,
}: {
  visible: boolean;
  client: ClientJour | null;
  onFermer: () => void;
  onModifieReussi: () => void;
}) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [nom, setNom] = useState('');
  const [kg, setKg] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const nomRef = useRef<TextInput>(null);
  const kgRef = useRef<TextInput>(null);
  useStabiliteClavier([nomRef, kgRef], visible);

  useEffect(() => {
    if (visible && client) {
      setNom(client.nom);
      setKg(String(client.kg));
      setErreur(null);
    }
  }, [visible, client]);

  function fermer() {
    setNom('');
    setKg('');
    setErreur(null);
    onFermer();
  }

  async function handleModifier() {
    if (!client) {
      return;
    }
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
      await modifierClient({ id: client.id, nom: nomNettoye, kg: kgNum });
      setNom('');
      setKg('');
      setErreur(null);
      onModifieReussi();
      onFermer();
    } catch (error) {
      setErreur(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={fermer}>
      <Pressable style={styles.overlay} onPress={Keyboard.dismiss}>
        <Pressable onPress={() => {}}>
          <View style={styles.popup}>
            <Text style={styles.title}>Modifier le client</Text>

            <Text style={styles.label}>Nom</Text>
            <TextInput style={styles.input} value={nom} onChangeText={setNom} ref={nomRef} />

            <Text style={styles.label}>Kg apportés</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={kg}
              onChangeText={setKg}
              ref={kgRef}
            />

            {erreur && <Text style={styles.erreur}>{erreur}</Text>}

            <View style={styles.actions}>
              <TextButton label="Annuler" onPress={fermer} />
              <FilledButton label="Enregistrer" onPress={handleModifier} />
            </View>
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
    input: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: theme.radius.sm,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.fontSizes.bodyMd,
      fontFamily: theme.fontFamilies.body,
      color: theme.colors.onSurface,
      backgroundColor: theme.colors.surfaceContainer,
    },
    erreur: {
      color: theme.colors.error,
      fontSize: theme.fontSizes.labelMd,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
  });
}
