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

  async function exporterTarifsAction() {
    await executer(async () => {
      const fichier = await exporterTarifs();
      await partagerFichier(fichier);
    });
  }

  async function exporterDettesAction() {
    await executer(async () => {
      const fichier = await exporterDettes();
      await partagerFichier(fichier);
    });
  }

  function messageImport(resultat: ResultatImport, libelle: string): string {
    const parties = [
      `${resultat.inseres} ligne(s) importée(s) ou corrigée(s)`,
      `${resultat.ignores} ignorée(s) (déjà présente${resultat.ignores > 1 ? 's' : ''})`,
    ];
    if (resultat.supprimes > 0) {
      parties.push(
        `${resultat.supprimes} retirée(s) (absent${resultat.supprimes > 1 ? 's' : ''} du fichier)`,
      );
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
      <AppBar title="Synchronisation" />
    <ScrollView contentContainerStyle={styles.content}>

      <View style={styles.texteBlock}>
        <Text style={styles.texteLabel}>Échanges avec les opérateurs</Text>
        <Text style={styles.texteTitre}>Importez les journées, envoyez les tarifs</Text>
      </View>

      <Text style={styles.sectionTitre}>Exporter vers les opérateurs</Text>
      <View style={styles.carte}>
        <FilledButton
          disabled={occupé}
          label="Exporter les tarifs (CSV)"
          icon={<MaterialCommunityIcons name="tune" size={20} color={theme.colors.onPrimary} />}
          onPress={exporterTarifsAction}
        />

        <FilledButton
          disabled={occupé}
          label="Exporter les dettes (journal complet)"
          icon={<MaterialCommunityIcons name="cash-sync" size={20} color={theme.colors.onPrimary} />}
          onPress={exporterDettesAction}
        />
      </View>

      <Text style={styles.sectionTitre}>Importer depuis les opérateurs</Text>
      <View style={styles.carte}>
        <FilledButton
          disabled={occupé}
          label="Importer une journée (CSV)"
          icon={<MaterialCommunityIcons name="calendar-check" size={20} color={theme.colors.onPrimary} />}
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
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
        <Text style={styles.infoText}>
          Échangez dettes.csv dans les deux sens : chaque téléphone ajoute ses mouvements
          (ajout, remboursement, annulation). Les lignes déjà connues sont ignorées ; un
          remboursement ou une correction se propage à l&apos;import. Importez aussi les
          journées des opérateurs et exportez les tarifs.
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
      gap: theme.spacing.md,
    },
    texteBlock: {
      gap: theme.spacing.xs,
    },
    texteLabel: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    texteTitre: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineMd,
      color: theme.colors.onSurface,
    },
    sectionTitre: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.xs,
    },
    carte: {
      backgroundColor: theme.colors.surfaceContainer,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    infoBox: {
      backgroundColor: theme.colors.surfaceContainer,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    infoText: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
    },
  });
}
