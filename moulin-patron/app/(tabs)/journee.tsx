import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar, androidRipple } from '@/components/ui/material';
import { listerJours, type Jour } from '@/lib/db/clients';
import { useAppTheme } from '@/lib/theme/useAppTheme';

function formaterDate(date: string): string {
  const [annee, mois, jour] = date.split('-').map(Number);
  const d = new Date(annee, mois - 1, jour);
  const libelle = d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return libelle.charAt(0).toUpperCase() + libelle.slice(1);
}

export default function JourneeScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [jours, setJours] = useState<Jour[]>([]);

  useFocusEffect(
    useCallback(() => {
      listerJours()
        .then(setJours)
        .catch((error) => {
          console.error('Erreur lors du chargement des journées :', error);
        });
    }, []),
  );

  return (
    <View style={styles.container}>
      <AppBar title="Journées" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContenu,
          { paddingBottom: theme.spacing.xl + insets.bottom },
        ]}>
        {jours.length === 0 ? (
          <View style={styles.vide}>
            <MaterialCommunityIcons
              name="calendar-blank"
              size={40}
              color={theme.colors.outline}
            />
            <Text style={styles.videTexte}>
              Aucune journée importée. Importez une journée depuis l&apos;onglet Sync.
            </Text>
          </View>
        ) : (
          jours.map((jour) => (
            <Pressable
              key={jour.date}
              android_ripple={androidRipple(theme.colors.ripple)}
              style={styles.carte}
              onPress={() =>
                router.push({ pathname: '/journee-detail', params: { date: jour.date } })
              }>
              <View style={styles.carteGauche}>
                <Text style={styles.carteDate}>{formaterDate(jour.date)}</Text>
                <Text style={styles.carteDetail}>
                  {jour.totalClients} client{jour.totalClients > 1 ? 's' : ''} · {jour.totalKg} kg
                </Text>
              </View>
              {jour.nonPaye > 0 ? (
                <View style={styles.badgeNonPaye}>
                  <Text style={styles.badgeNonPayeTexte}>{jour.nonPaye} non payé</Text>
                </View>
              ) : (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={24}
                  color={theme.colors.success}
                />
              )}
            </Pressable>
          ))
        )}
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
    scrollContenu: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    vide: {
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.xl,
    },
    videTexte: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    carte: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      minHeight: 64,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.sm,
      overflow: 'hidden',
      ...theme.elevation.card,
    },
    carteGauche: {
      flex: 1,
      gap: 2,
    },
    carteDate: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurface,
    },
    carteDetail: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
    },
    badgeNonPaye: {
      backgroundColor: theme.colors.error,
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    badgeNonPayeTexte: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: '#ffffff',
    },
  });
}
