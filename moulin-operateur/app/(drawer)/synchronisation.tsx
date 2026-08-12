import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar, FilledButton, androidRipple } from '@/components/ui/material';
import { useAppTheme } from '@/lib/theme/useAppTheme';
import { exporterDettes, exporterJournee, partagerFichier } from '@/lib/sync/export';
import { importerDettes, importerTarifs, type ResultatImport } from '@/lib/sync/import';

export default function SynchronisationScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const [occupé, setOccupé] = useState(false);
  const [dateSelectionnee, setDateSelectionnee] = useState(() => new Date());
  const [afficherPicker, setAfficherPicker] = useState(false);

  const annee = dateSelectionnee.getFullYear();
  const mois = String(dateSelectionnee.getMonth() + 1).padStart(2, '0');
  const jour = String(dateSelectionnee.getDate()).padStart(2, '0');
  const dateAffichee = `${annee}-${mois}-${jour}`;
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

  async function exporterJourneeAction() {
    await executer(async () => {
      const fichier = await exporterJournee(dateAffichee);
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContenu,
          { paddingBottom: theme.spacing.xl + insets.bottom },
        ]}>
        <Text style={styles.sousTitre}>Échanges de fichiers CSV avec l&apos;application Patron</Text>

        <Text style={styles.sectionTitre}>EXPORTER VERS LE PATRON</Text>
        <View style={styles.carte}>
          <Pressable
            android_ripple={androidRipple(theme.colors.ripple)}
            style={styles.ligneAction}
            onPress={() => setAfficherPicker(true)}>
            <View style={styles.ligneActionIcone}>
              <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.ligneActionTexte}>
              <Text style={styles.ligneActionTitre}>Journée du {dateLibelle}</Text>
              <Text style={styles.ligneActionDetail}>
                Touchez pour changer de date, puis exportez la journée
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.outline} />
          </Pressable>

          <FilledButton
            disabled={occupé}
            label={`Exporter la journée (${dateAffichee})`}
            icon={<MaterialCommunityIcons name="file-export" size={20} color={theme.colors.onPrimary} />}
            onPress={exporterJourneeAction}
          />

          <FilledButton
            disabled={occupé}
            label="Exporter les dettes (journal complet)"
            icon={<MaterialCommunityIcons name="cash-sync" size={20} color={theme.colors.onPrimary} />}
            onPress={exporterDettesAction}
          />
        </View>

        <Text style={styles.sectionTitre}>IMPORTER DEPUIS LE PATRON</Text>
        <View style={styles.carte}>
          <FilledButton
            disabled={occupé}
            label="Importer les tarifs (CSV)"
            icon={<MaterialCommunityIcons name="tune" size={20} color={theme.colors.onPrimary} />}
            onPress={() => importerFichier(importerTarifs, 'les tarifs')}
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
          <Text style={styles.infoTexte}>
            Transférez les fichiers vers l&apos;autre téléphone (Partage à proximité, Bluetooth ou
            e-mail), puis importez-les depuis l&apos;autre application. Les lignes déjà connues sont
            ignorées : un fichier peut être envoyé plusieurs fois sans créer de doublons.
          </Text>
        </View>
      </ScrollView>

      {afficherPicker && (
        <DateTimePicker
          value={dateSelectionnee}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, date) => {
            if (Platform.OS === 'android') {
              setAfficherPicker(false);
            }
            if (event.type === 'set' && date) {
              setDateSelectionnee(date);
            }
            if (event.type === 'dismissed') {
              setAfficherPicker(false);
            }
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
    scroll: {
      flex: 1,
    },
    scrollContenu: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    sousTitre: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
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
    ligneAction: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      gap: theme.spacing.sm,
      overflow: 'hidden',
      borderRadius: theme.radius.md,
    },
    ligneActionIcone: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ligneActionTexte: {
      flex: 1,
      gap: 2,
    },
    ligneActionTitre: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurface,
    },
    ligneActionDetail: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
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
    infoTexte: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
    },
  });
}
