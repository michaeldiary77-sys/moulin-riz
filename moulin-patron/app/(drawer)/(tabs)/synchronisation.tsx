import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { File } from 'expo-file-system';

import { AppBar, FilledButton } from '@/components/ui/material';
import { useAppTheme } from '@/lib/theme/useAppTheme';
import { exporterDettes, exporterTarifs, partagerFichier } from '@/lib/sync/export';
import { importerDettes, importerJournee, type ResultatImport } from '@/lib/sync/import';

export default function SynchronisationScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [occupé, setOccupé] = useState(false);

  async function executer(operation: () => Promise<void>) {
    if (occupé) {
      return;
    }
    setOccupé(true);
    try {
      await operation();
    } catch (error) {
      Alert.alert(
        'Synchronisation',
        error instanceof Error ? error.message : 'Une erreur est survenue.',
      );
    } finally {
      setOccupé(false);
    }
  }

  function messageImport(resultat: ResultatImport, libelle: string): string {
    const parties = [
      `${resultat.inseres} ligne(s) importée(s) ou corrigée(s)`,
      `${resultat.ignores} ignorée(s)`,
    ];
    if (resultat.supprimes > 0) {
      parties.push(`${resultat.supprimes} retirée(s)`);
    }
    return `${parties.join(', ')} dans ${libelle}.`;
  }

  async function importerFichier(
    importeur: (contenu: string) => Promise<ResultatImport>,
    libelle: string,
  ) {
    await executer(async () => {
      const fichier = await File.pickFileAsync();
      const fichierUnique = Array.isArray(fichier) ? fichier[0] : fichier;
      if (!fichierUnique) {
        throw new Error('Aucun fichier sélectionné.');
      }
      const contenu = await fichierUnique.text();
      const resultat = await importeur(contenu);
      Alert.alert('Import réussi', messageImport(resultat, libelle));
      if (resultat.avertissements.length > 0) {
        Alert.alert('Attention', resultat.avertissements.join('\n'));
      }
    });
  }

  return (
    <View style={styles.container}>
      <AppBar title="Synchronisation" subtitle="Fichiers CSV avec l'opérateur" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitre}>Exporter vers l'opérateur</Text>
        <View style={styles.carte}>
          <FilledButton
            disabled={occupé}
            label="Exporter les tarifs (CSV)"
            icon={<MaterialCommunityIcons name="tune" size={20} color={theme.colors.onPrimary} />}
            onPress={() =>
              executer(async () => {
                await partagerFichier(await exporterTarifs());
              })
            }
          />
          <FilledButton
            disabled={occupé}
            label="Exporter les dettes (journal complet)"
            icon={<MaterialCommunityIcons name="cash-sync" size={20} color={theme.colors.onPrimary} />}
            onPress={() =>
              executer(async () => {
                await partagerFichier(await exporterDettes());
              })
            }
          />
        </View>

        <Text style={styles.sectionTitre}>Importer depuis l'opérateur</Text>
        <View style={styles.carte}>
          <FilledButton
            disabled={occupé}
            label="Importer une journée (CSV)"
            icon={
              <MaterialCommunityIcons name="calendar-check" size={20} color={theme.colors.onPrimary} />
            }
            onPress={() => importerFichier(importerJournee, 'la journée')}
          />
          <FilledButton
            disabled={occupé}
            label="Importer les dettes (CSV)"
            icon={<MaterialCommunityIcons name="cash-sync" size={20} color={theme.colors.onPrimary} />}
            onPress={() => importerFichier(importerDettes, 'les dettes')}
          />
        </View>

        <View style={styles.infoBox}>
          <MaterialCommunityIcons
            name="information-outline"
            size={18}
            color={theme.colors.onSurfaceVariant}
          />
          <Text style={styles.infoText}>
            Les dettes s'échangent dans les deux sens. Les lignes déjà connues sont ignorées ; un
            remboursement ou une annulation se propage à l'import.
          </Text>
        </View>
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
    content: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    sectionTitre: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.xs,
    },
    carte: {
      backgroundColor: theme.colors.surfaceContainer,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    infoBox: {
      backgroundColor: theme.colors.surfaceContainer,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    infoText: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
    },
  });
}
