import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilledButton, TextButton, androidRipple } from '@/components/ui/material';
import { useAppTheme } from '@/lib/theme/useAppTheme';

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
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFermer}>
      <Pressable style={styles.overlay} onPress={onFermer}>
        <Pressable style={styles.panneauWrapper} onPress={() => {}}>
          <View style={[styles.panneau, { paddingBottom: theme.spacing.md + insets.bottom }]}>
            <View style={styles.handle} />
            <Text style={styles.nomClient}>{nomClient}</Text>

            <FilledButton
              label="Payer"
              icon={<MaterialCommunityIcons name="cash" size={22} color={theme.colors.onPrimary} />}
              onPress={() => {
                onPayer();
                onFermer();
              }}
            />

            <Pressable
              android_ripple={androidRipple(theme.colors.ripple)}
              style={styles.boutonModifier}
              onPress={() => {
                onModifier();
                onFermer();
              }}>
              <MaterialCommunityIcons name="pencil" size={22} color={theme.colors.onSurface} />
              <Text style={styles.boutonModifierText}>Modifier</Text>
            </Pressable>

            <Pressable
              android_ripple={androidRipple(theme.colors.ripple)}
              style={styles.boutonSupprimer}
              onPress={onSupprimer}>
              <MaterialCommunityIcons name="delete" size={22} color={theme.colors.error} />
              <Text style={styles.boutonSupprimerText}>Supprimer</Text>
            </Pressable>

            <TextButton label="Annuler" onPress={onFermer} />
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
      justifyContent: 'flex-end',
    },
    panneauWrapper: {
      width: '100%',
    },
    panneau: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    handle: {
      alignSelf: 'center',
      width: 32,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.outline,
      marginBottom: theme.spacing.sm,
    },
    nomClient: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.headlineSm,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    boutonModifier: {
      backgroundColor: theme.colors.surfaceContainerHigh,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      overflow: 'hidden',
    },
    boutonModifierText: {
      color: theme.colors.onSurface,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.bodyMd,
    },
    boutonSupprimer: {
      backgroundColor: 'transparent',
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.error,
      overflow: 'hidden',
    },
    boutonSupprimerText: {
      color: theme.colors.error,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.bodyMd,
    },
  });
}
