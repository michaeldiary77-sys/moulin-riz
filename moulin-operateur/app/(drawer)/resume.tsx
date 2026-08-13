import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar, TextButton, androidRipple } from '@/components/ui/material';
import { useProfilActif } from '@/lib/context/ProfilActifContext';
import { listerClientsDuJour } from '@/lib/db/clients';
import { useAppTheme } from '@/lib/theme/useAppTheme';

function dateVersCle(date: Date): string {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

export default function ResumeScreen() {
  const { profilActif, definirProfilActif } = useProfilActif();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const [dateSelectionnee, setDateSelectionnee] = useState(() => new Date());
  const [afficherPicker, setAfficherPicker] = useState(false);
  const [totalKg, setTotalKg] = useState(0);
  const [nombreClients, setNombreClients] = useState(0);
  const [nombreNonPaye, setNombreNonPaye] = useState(0);
  const [nombrePayeAr, setNombrePayeAr] = useState(0);
  const [nombrePayeKpk, setNombrePayeKpk] = useState(0);

  const date = dateVersCle(dateSelectionnee);
  const dateFormatee = dateSelectionnee.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  useFocusEffect(
    useCallback(() => {
      listerClientsDuJour(date)
        .then((clients) => {
          setTotalKg(clients.reduce((somme, c) => somme + c.kg, 0));
          setNombreClients(clients.length);
          setNombreNonPaye(clients.filter((c) => c.statut === 'non_paye').length);
          setNombrePayeAr(clients.filter((c) => c.statut === 'paye' && c.modePaiement === 'Ar').length);
          setNombrePayeKpk(
            clients.filter((c) => c.statut === 'paye' && c.modePaiement === 'Kpk').length,
          );
        })
        .catch((error) => {
          console.error('Erreur lors du calcul des statistiques :', error);
        });
    }, [date]),
  );

  return (
    <View style={styles.container}>
      <AppBar
        title="Résumé"
        subtitle={profilActif?.nom ? `Opérateur : ${profilActif.nom}` : undefined}
        right={<TextButton label="Changer" onPress={() => definirProfilActif(null)} />}
      />

      <View style={styles.dateBar}>
        <Pressable
          style={styles.dateBarZone}
          android_ripple={androidRipple(theme.colors.ripple)}
          onPress={() => setAfficherPicker(true)}>
          <MaterialCommunityIcons name="calendar" size={22} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.dateBarText}>{dateFormatee}</Text>
        </Pressable>
        <TextButton label="Aujourd'hui" onPress={() => setDateSelectionnee(new Date())} />
      </View>

      {afficherPicker && (
        <DateTimePicker
          value={dateSelectionnee}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, dateChoisie) => {
            if (Platform.OS === 'android') {
              setAfficherPicker(false);
            }
            if (event.type === 'set' && dateChoisie) {
              setDateSelectionnee(dateChoisie);
            }
            if (event.type === 'dismissed') {
              setAfficherPicker(false);
            }
          }}
        />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: theme.spacing.xl + insets.bottom },
        ]}>
        <Text style={styles.sousTitre}>Suivi du jour — {dateFormatee}</Text>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total collecté</Text>
          <Text style={styles.statTotal}>{totalKg} kg</Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>Clients</Text>
            <Text style={styles.miniNombre}>{nombreClients}</Text>
          </View>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>Non payé</Text>
            <Text style={[styles.miniNombre, styles.miniNombreWarning]}>{nombreNonPaye}</Text>
          </View>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>Payé Ar</Text>
            <Text style={[styles.miniNombre, styles.miniNombreSuccess]}>{nombrePayeAr}</Text>
          </View>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>Payé Kpk</Text>
            <Text style={[styles.miniNombre, styles.miniNombreSuccess]}>{nombrePayeKpk}</Text>
          </View>
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
    dateBar: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline,
    },
    dateBarZone: {
      flex: 1,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    dateBarText: {
      flex: 1,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurface,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    sousTitre: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    statCard: {
      backgroundColor: theme.colors.surfaceContainerHigh,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      minHeight: 88,
      justifyContent: 'center',
      ...theme.elevation.card,
    },
    statLabel: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    statTotal: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineLg,
      color: theme.colors.onSurface,
    },
    statRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    miniCard: {
      flexGrow: 1,
      flexBasis: '45%',
      minHeight: 72,
      backgroundColor: theme.colors.surfaceContainerHigh,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      justifyContent: 'center',
    },
    miniLabel: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    miniNombre: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.headlineSm,
      color: theme.colors.onSurface,
    },
    miniNombreWarning: {
      color: theme.colors.warning,
    },
    miniNombreSuccess: {
      color: theme.colors.success,
    },
  });
}
