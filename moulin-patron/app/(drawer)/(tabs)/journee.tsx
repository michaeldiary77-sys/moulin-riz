import { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppBar, TextButton, androidRipple } from '@/components/ui/material';
import { listerJours, type Jour } from '@/lib/db/clients';
import { useStabiliteClavier } from '@/lib/hooks/useStabiliteClavier';
import { useAppTheme } from '@/lib/theme/useAppTheme';

function dateVersCle(date: Date): string {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

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
  const router = useRouter();
  const [jours, setJours] = useState<Jour[]>([]);
  const [dateSelectionnee, setDateSelectionnee] = useState(() => new Date());
  const [afficherPicker, setAfficherPicker] = useState(false);
  const [filtrerDate, setFiltrerDate] = useState(false);
  const [recherche, setRecherche] = useState('');
  const rechercheRef = useRef<TextInput>(null);
  useStabiliteClavier([rechercheRef]);

  useFocusEffect(
    useCallback(() => {
      listerJours()
        .then(setJours)
        .catch((error) => {
          console.error('Erreur lors du chargement des journées :', error);
        });
    }, []),
  );

  const dateCle = dateVersCle(dateSelectionnee);
  const dateLibelle = dateSelectionnee.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const texteRecherche = recherche.trim().toLowerCase();
  const joursFiltres = jours.filter((jour) => {
    if (filtrerDate && jour.date !== dateCle) {
      return false;
    }
    if (!texteRecherche) {
      return true;
    }
    return (
      formaterDate(jour.date).toLowerCase().includes(texteRecherche) ||
      jour.date.includes(texteRecherche) ||
      String(jour.totalKg).includes(texteRecherche)
    );
  });

  return (
    <View style={styles.container}>
      <AppBar title="Journées" subtitle="Journées importées des opérateurs" />

      <View style={styles.dateBar}>
        <Pressable
          style={styles.dateBarZone}
          android_ripple={androidRipple(theme.colors.ripple)}
          onPress={() => setAfficherPicker(true)}>
          <MaterialCommunityIcons name="calendar" size={22} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.dateBarText}>{dateLibelle}</Text>
        </Pressable>
        <TextButton
          label="Aujourd'hui"
          onPress={() => {
            setDateSelectionnee(new Date());
            setFiltrerDate(true);
          }}
        />
      </View>

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
              setFiltrerDate(true);
            }
            if (event.type === 'dismissed') {
              setAfficherPicker(false);
            }
          }}
        />
      )}

      <View style={styles.rechercheWrap}>
        <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.onSurfaceVariant} />
        <TextInput
          style={styles.recherche}
          value={recherche}
          onChangeText={setRecherche}
          placeholder="Rechercher une journée"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          ref={rechercheRef}
        />
        {filtrerDate ? (
          <TextButton label="Toutes" onPress={() => setFiltrerDate(false)} />
        ) : null}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContenu}>
        {joursFiltres.length === 0 ? (
          <Text style={styles.vide}>
            {jours.length === 0
              ? "Aucune journée importée. Importez une journée depuis Sync."
              : 'Aucun résultat'}
          </Text>
        ) : (
          joursFiltres.map((jour) => (
            <Pressable
              key={jour.date}
              android_ripple={androidRipple(theme.colors.ripple)}
              style={[
                styles.carte,
                {
                  borderLeftColor:
                    jour.nonPaye > 0 ? theme.colors.error : theme.colors.success,
                },
              ]}
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
                <Text style={styles.badgeNonPaye}>{jour.nonPaye} non payé</Text>
              ) : (
                <Text style={styles.badgeOk}>OK</Text>
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
    rechercheWrap: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
      minHeight: 44,
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.surfaceContainerHigh,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    recherche: {
      flex: 1,
      minHeight: 44,
      color: theme.colors.onSurface,
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
    },
    scroll: {
      flex: 1,
    },
    scrollContenu: {
      padding: theme.spacing.md,
    },
    vide: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      paddingVertical: theme.spacing.xl,
    },
    carte: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      minHeight: 52,
      borderLeftWidth: 4,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
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
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    badgeNonPaye: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.error,
    },
    badgeOk: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.success,
    },
  });
}
