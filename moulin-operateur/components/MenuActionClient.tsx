import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/lib/theme/useAppTheme';

/**
 * Menu d'actions long-press d'un client "en attente" : panneau ancré en
 * bas de l'écran (Payer / Modifier / Supprimer / Annuler). Aucune logique
 * métier ici : il ne fait qu'appeler les callbacks reçus en props.
 */
export function MenuActionClient({
  visible,
  nomClient,
  onFermer,
  onPayer,
  onModifier,
  onSupprimer,
}: {
  visible: boolean;
  nomClient: string | null;
  onFermer: () => void;
  onPayer: () => void;
  onModifier: () => void;
  onSupprimer: () => void;
}) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onFermer}>
        <Pressable style={styles.panneauWrapper} onPress={() => {}}>
          <View style={styles.panneau}>
            <Text style={styles.nomClient}>{nomClient}</Text>

            <Pressable
              style={styles.boutonPayer}
              onPress={() => {
                onPayer();
                onFermer();
              }}>
              <MaterialCommunityIcons name="cash" size={24} color={theme.colors.onPrimary} />
              <Text style={styles.boutonPayerText}>Payer</Text>
            </Pressable>

            <Pressable
              style={styles.boutonModifier}
              onPress={() => {
                onModifier();
                onFermer();
              }}>
              <MaterialCommunityIcons name="pencil" size={24} color={theme.colors.onSurface} />
              <Text style={styles.boutonModifierText}>Modifier</Text>
            </Pressable>

            <Pressable style={styles.boutonSupprimer} onPress={onSupprimer}>
              <MaterialCommunityIcons name="delete" size={24} color={theme.colors.error} />
              <Text style={styles.boutonSupprimerText}>Supprimer</Text>
            </Pressable>

            <Pressable style={styles.boutonAnnuler} onPress={onFermer}>
              <Text style={styles.boutonAnnulerText}>Annuler</Text>
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
      justifyContent: 'flex-end',
    },
    panneauWrapper: {
      width: '100%',
    },
    panneau: {
      backgroundColor: theme.colors.surfaceContainer,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    nomClient: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineSm,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    boutonPayer: {
      backgroundColor: theme.colors.primary,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
    boutonPayerText: {
      color: theme.colors.onPrimary,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.bodyMd,
    },
    boutonModifier: {
      backgroundColor: theme.colors.surfaceContainerHigh,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
    boutonModifierText: {
      color: theme.colors.onSurface,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.bodyMd,
    },
    boutonSupprimer: {
      backgroundColor: 'transparent',
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    boutonSupprimerText: {
      color: theme.colors.error,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.bodyMd,
    },
    boutonAnnuler: {
      backgroundColor: theme.colors.surfaceContainerHigh,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    boutonAnnulerText: {
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.bodyMd,
    },
  });
}
