import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfilActif } from '@/lib/context/ProfilActifContext';
import { listerClientsDuJour } from '@/lib/db/clients';
import { useAppTheme } from '@/lib/theme/useAppTheme';
import { dateDuJourLocal } from '@/lib/utils/date';

export default function ResumeScreen() {
  const { profilActif, definirProfilActif } = useProfilActif();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation();
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
      <View style={[styles.topBar, { paddingTop: theme.spacing.md + insets.top }]}>
        <View style={styles.topBarLeft}>
          <Pressable onPress={() => (navigation as any).openDrawer()}>
            <MaterialCommunityIcons name="menu" size={28} color={theme.colors.primary} />
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {profilActif?.nom?.charAt(0).toUpperCase() ?? ''}
            </Text>
          </View>
          <View style={styles.topBarText}>
            <Text style={styles.operateurLabel}>
              Opérateur : {profilActif?.nom}
            </Text>
            <Text style={styles.moulinTitre}>Moulin de Riz</Text>
          </View>
        </View>
        <Pressable style={styles.changerButton} onPress={() => definirProfilActif(null)}>
          <Text style={styles.changerButtonText}>Changer</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: theme.spacing.xl + theme.spacing.lg + insets.bottom },
        ]}>
        <Text style={styles.sousTitre}>Suivi des récoltes — {dateFormatee}</Text>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TOTAL COLLECTÉ</Text>
          <Text style={styles.statTotal}>
            {totalKg} kg
          </Text>
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
    topBar: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    topBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLetter: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.bodyLg,
      color: theme.colors.primary,
    },
    topBarText: {
      gap: 2,
    },
    operateurLabel: {
      fontFamily: theme.fontFamilies.mono,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    moulinTitre: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      color: theme.colors.primary,
    },
    changerButton: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    changerButtonText: {
      color: theme.colors.primary,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.xl + theme.spacing.lg,
    },
    sousTitre: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.xs,
    },
    statCard: {
      backgroundColor: theme.colors.surfaceContainerHigh,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    statLabel: {
      fontFamily: theme.fontFamilies.mono,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    statTotal: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineSm,
      color: theme.colors.primary,
    },
    statRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    miniCard: {
      flex: 1,
      backgroundColor: theme.colors.surfaceContainerHigh,
      borderRadius: theme.radius.md,
      padding: theme.spacing.xs,
    },
    miniLabel: {
      fontFamily: theme.fontFamilies.mono,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    miniNombre: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.bodyLg,
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
