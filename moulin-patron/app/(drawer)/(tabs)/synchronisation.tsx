import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { File } from 'expo-file-system';

import { AppBar, FilledButton, androidRipple } from '@/components/ui/material';
import { useAppTheme } from '@/lib/theme/useAppTheme';
import { exporterDettes, exporterJournee, exporterTarifs, partagerFichier } from '@/lib/sync/export';
import { importerDettes, importerJournee, type ResultatImport } from '@/lib/sync/import';

export default function SynchronisationScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [occupé, setOccupé] = useState(false);
  const [dateSelectionnee, setDateSelectionnee] = useState(() => new Date());
  const [afficherPicker, setAfficherPicker] = useState(false);

  const dateAffichee = `${dateSelectionnee.getFullYear()}-${String(dateSelectionnee.getMonth() + 1).padStart(2, '0')}-${String(dateSelectionnee.getDate()).padStart(2, '0')}`;
  const dateLibelle = dateSelectionnee.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
      <AppBar title="Synchronisation" subtitle="Fichiers CSV avec l’opérateur" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitre}>Exporter vers l’opérateur</Text>
        <View style={styles.carte}>
          <Pressable
            android_ripple={androidRipple(theme.colors.ripple)}
            style={styles.dateAction}
            onPress={() => setAfficherPicker(true)}>
            <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary} />
            <Text style={styles.dateActionTexte}>Journée du {dateLibelle}</Text>
          </Pressable>
          <FilledButton
            disabled={occupé}
            label="Exporter la journée fusionnée"
            icon={<MaterialCommunityIcons name="calendar-export" size={20} color={theme.colors.onPrimary} />}
            onPress={() =>
              executer(async () => {
                await partagerFichier(await exporterJournee(dateAffichee));
              })
            }
          />
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

        <Text style={styles.sectionTitre}>Importer depuis l’opérateur</Text>
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
            Les journées sont fusionnées sans suppression implicite. Les dettes s’échangent dans
            les deux sens et les remboursements ou annulations se propagent à l’import.
          </Text>
        </View>
      </ScrollView>

      {afficherPicker && (
        <DateTimePicker
          value={dateSelectionnee}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, date) => {
            if (Platform.OS === 'android') setAfficherPicker(false);
            if (event.type === 'set' && date) setDateSelectionnee(date);
            if (event.type === 'dismissed') setAfficherPicker(false);
          }}
        />
      )}
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
    dateAction: {
      minHeight: 48,
      borderRadius: theme.radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      overflow: 'hidden',
    },
    dateActionTexte: {
      flex: 1,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurface,
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
