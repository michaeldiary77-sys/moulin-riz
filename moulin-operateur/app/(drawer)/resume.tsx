import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar, TextButton } from '@/components/ui/material';
import { useProfilActif } from '@/lib/context/ProfilActifContext';
import { listerClientsDuJour } from '@/lib/db/clients';
import { useAppTheme } from '@/lib/theme/useAppTheme';
import { dateDuJourLocal } from '@/lib/utils/date';

export default function ResumeScreen() {
  const { profilActif, definirProfilActif } = useProfilActif();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const [totalKg, setTotalKg] = useState(0);
  const [nombreClients, setNombreClients] = useState(0);
  const [nombreNonPaye, setNombreNonPaye] = useState(0);
  const [nombrePayeAr, setNombrePayeAr] = useState(0);
  const [nombrePayeKpk, setNombrePayeKpk] = useState(0);

  const date = dateDuJourLocal();
  const dateAffichee = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });
  const dateFormatee =
    dateAffichee.charAt(0).toUpperCase() + dateAffichee.slice(1);

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
