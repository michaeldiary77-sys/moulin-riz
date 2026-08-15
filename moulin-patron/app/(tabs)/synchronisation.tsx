import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { File } from 'expo-file-system';

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

  async function exporterJourneeAction() {
    await executer(async () => {
      const fichier = await exporterJournee(dateAffichee);
      await partagerFichier(fichier);
    });
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
        <Text style={styles.headerTitle}>Synchronisation</Text>
        <View style={styles.profilCircle}>
          <MaterialCommunityIcons name="sync" size={22} color={theme.colors.primary} />
        </View>
      </View>

      <View style={styles.texteBlock}>
        <Text style={styles.texteLabel}>ÉCHANGES AVEC LES OPÉRATEURS</Text>
        <Text style={styles.texteTitre}>Importez les journées, envoyez les tarifs</Text>
      </View>

      <Text style={styles.sectionTitre}>EXPORTER VERS LES OPÉRATEURS</Text>
      <View style={styles.carte}>
        <Pressable style={styles.boutonSecondaire} onPress={() => setAfficherPicker(true)}>
          <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary} />
          <Text style={styles.boutonSecondaireTexte}>Journée du {dateAffichee}</Text>
        </Pressable>
        <Pressable style={styles.bouton} onPress={exporterJourneeAction} disabled={occupé}>
          <MaterialCommunityIcons name="calendar-export" size={20} color={theme.colors.onPrimary} />
          <Text style={styles.boutonTexte}>Exporter la journée fusionnée</Text>
        </Pressable>

        <Pressable style={styles.bouton} onPress={exporterTarifsAction} disabled={occupé}>
          <MaterialCommunityIcons name="tune" size={20} color={theme.colors.onPrimary} />
          <Text style={styles.boutonTexte}>Exporter les tarifs (CSV)</Text>
        </Pressable>

        <Pressable style={styles.bouton} onPress={exporterDettesAction} disabled={occupé}>
          <MaterialCommunityIcons name="cash-sync" size={20} color={theme.colors.onPrimary} />
          <Text style={styles.boutonTexte}>Exporter les dettes (journal complet)</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitre}>IMPORTER DEPUIS LES OPÉRATEURS</Text>
      <View style={styles.carte}>
        <Pressable
          style={styles.bouton}
          onPress={() => importerFichier(importerJournee, 'la journée')}
          disabled={occupé}>
          <MaterialCommunityIcons name="calendar-check" size={20} color={theme.colors.onPrimary} />
          <Text style={styles.boutonTexte}>Importer une journée (CSV)</Text>
        </Pressable>

        <Pressable
          style={styles.bouton}
          onPress={() => importerFichier(importerDettes, 'les dettes')}
          disabled={occupé}>
          <MaterialCommunityIcons name="cash-sync" size={20} color={theme.colors.onPrimary} />
          <Text style={styles.boutonTexte}>Importer les dettes (CSV)</Text>
        </Pressable>
      </View>

      <View style={styles.infoBox}>
        <MaterialCommunityIcons
          name="information-outline"
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
        <Text style={styles.infoText}>
          Les journées sont fusionnées par identifiant, sans suppression implicite. Après les
          imports, exportez la journée consolidée pour la renvoyer aux opérateurs.
        </Text>
      </View>

      {afficherPicker && (
        <DateTimePicker
          value={dateSelectionnee}
          mode="date"
          maximumDate={new Date()}
          onChange={(_, date) => {
            setAfficherPicker(false);
            if (date) setDateSelectionnee(date);
          }}
        />
      )}
    </ScrollView>
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    headerTitle: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineSm,
      color: theme.colors.primary,
    },
    profilCircle: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    texteBlock: {
      gap: theme.spacing.xs,
    },
    texteLabel: {
      fontFamily: theme.fontFamilies.mono,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
      letterSpacing: 1,
    },
    texteTitre: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineMd,
      color: theme.colors.onSurface,
    },
    sectionTitre: {
      fontFamily: theme.fontFamilies.mono,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
      letterSpacing: 1,
      marginTop: theme.spacing.xs,
    },
    carte: {
      backgroundColor: theme.colors.surfaceContainer,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    bouton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
    boutonSecondaire: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
    boutonSecondaireTexte: {
      color: theme.colors.primary,
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.bodyMd,
    },
    boutonTexte: {
      color: theme.colors.onPrimary,
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.bodyMd,
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
