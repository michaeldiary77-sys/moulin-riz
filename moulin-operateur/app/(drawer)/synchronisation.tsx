import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/lib/theme/useAppTheme';
import { exporterDettes, exporterJournee, partagerFichier } from '@/lib/sync/export';
import { importerDettes, importerJournee, importerTarifs, type ResultatImport } from '@/lib/sync/import';

export default function SynchronisationScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation();
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
      <View style={[styles.header, { paddingTop: theme.spacing.md + insets.top }]}>
        <View style={styles.headerGauche}>
          <Pressable onPress={() => (navigation as any).openDrawer()}>
            <MaterialCommunityIcons name="menu" size={28} color={theme.colors.primary} />
          </Pressable>
          <View style={styles.headerCercle}>
            <MaterialCommunityIcons name="sync" size={24} color={theme.colors.onPrimary} />
          </View>
          <Text style={styles.headerTitre}>Synchronisation</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContenu,
          { paddingBottom: theme.spacing.xl + insets.bottom },
        ]}>
        <Text style={styles.sousTitre}>Échanges de fichiers CSV avec l&apos;application Patron</Text>

        <Text style={styles.sectionTitre}>EXPORTER VERS LE PATRON</Text>
        <View style={styles.carte}>
          <Pressable style={styles.ligneAction} onPress={() => setAfficherPicker(true)}>
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

          <Pressable style={styles.bouton} onPress={exporterJourneeAction} disabled={occupé}>
            <MaterialCommunityIcons name="file-export" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.boutonTexte}>Exporter la journée ({dateAffichee})</Text>
          </Pressable>

          <Pressable style={styles.bouton} onPress={exporterDettesAction} disabled={occupé}>
            <MaterialCommunityIcons name="cash-sync" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.boutonTexte}>Exporter les dettes (journal complet)</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitre}>IMPORTER DEPUIS LE PATRON</Text>
        <View style={styles.carte}>
          <Pressable
            style={styles.bouton}
            onPress={() => importerFichier(importerJournee, 'la journée fusionnée')}
            disabled={occupé}>
            <MaterialCommunityIcons name="calendar-import" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.boutonTexte}>Importer une journée (CSV)</Text>
          </Pressable>

          <Pressable
            style={styles.bouton}
            onPress={() => importerFichier(importerTarifs, 'les tarifs')}
            disabled={occupé}>
            <MaterialCommunityIcons name="tune" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.boutonTexte}>Importer les tarifs (CSV)</Text>
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
            setAfficherPicker(false);
            if (date) {
              setDateSelectionnee(date);
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    headerGauche: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    headerCercle: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitre: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineSm,
      color: theme.colors.primary,
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
    ligneAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
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
