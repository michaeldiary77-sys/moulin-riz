import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';

import { AppBar, TextButton, androidRipple } from '@/components/ui/material';
import { listerClientsEntre, type ClientJour } from '@/lib/db/clients';
import { listerDettes, listerIdsCorrections, type Dette } from '@/lib/db/dettes';
import { useAppTheme } from '@/lib/theme/useAppTheme';
import { dateDuJourLocal } from '@/lib/utils/date';
import { dateLocaleIso } from '@/lib/utils/periode';

export default function GraphiquesScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [dateSelectionnee, setDateSelectionnee] = useState(() => new Date());
  const [afficherPicker, setAfficherPicker] = useState(false);
  const [clients, setClients] = useState<ClientJour[]>([]);
  const [dettes, setDettes] = useState<Dette[]>([]);
  const [corrigees, setCorrigees] = useState<Set<string>>(new Set());

  const d0 = `${dateSelectionnee.getFullYear()}-${String(dateSelectionnee.getMonth() + 1).padStart(2, '0')}-${String(dateSelectionnee.getDate()).padStart(2, '0')}`;
  const d1 = d0;
  const dateLibelle = dateSelectionnee.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  useFocusEffect(
    useCallback(() => {
      Promise.all([listerClientsEntre(d0, d1), listerDettes(), listerIdsCorrections()])
        .then(([c, d, ids]) => {
          setClients(c);
          setDettes(d);
          setCorrigees(new Set(ids));
        })
        .catch((error) => console.error('Erreur graphiques :', error));
    }, [d0, d1]),
  );

  const kgParJour = useMemo(
    () => [{ label: d0.slice(8), valeur: clients.reduce((total, client) => total + client.kg, 0) }],
    [clients, d0],
  );

  const payes = clients.filter((c) => c.statut === 'paye').length;
  const nonPayes = clients.filter((c) => c.statut === 'non_paye').length;
  const payeAr = clients
    .filter((c) => c.statut === 'paye' && c.modePaiement === 'Ar')
    .reduce((s, c) => s + (c.montant ?? 0), 0);
  const payeKpk = clients
    .filter((c) => c.statut === 'paye' && c.modePaiement === 'Kpk')
    .reduce((s, c) => s + (c.montant ?? 0), 0);

  const dettesPeriode = dettes.filter((d) => {
    if (corrigees.has(d.id) || d.correctionDe) {
      return false;
    }
    const jour = dateLocaleIso(d.createdAt);
    return jour >= d0 && jour <= d1;
  });
  const montantPlus = dettesPeriode
    .filter((d) => d.type === 'dette_plus')
    .reduce((s, d) => s + d.montant, 0);
  const montantMoins = dettesPeriode
    .filter((d) => d.type === 'dette_moins')
    .reduce((s, d) => s + d.montant, 0);

  return (
    <View style={styles.container}>
      <AppBar title="Graphiques" subtitle="Représentations de la journée" />

      <View style={styles.dateBar}>
        <Pressable
          style={styles.dateBarZone}
          android_ripple={androidRipple(theme.colors.ripple)}
          onPress={() => setAfficherPicker(true)}>
          <MaterialCommunityIcons name="calendar" size={22} color={theme.colors.primary} />
          <Text style={styles.dateBarText}>{dateLibelle}</Text>
        </Pressable>
        <TextButton
          label="Aujourd'hui"
          onPress={() => setDateSelectionnee(new Date(`${dateDuJourLocal()}T12:00:00`))}
        />
      </View>

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

      <ScrollView contentContainerStyle={styles.contenu}>
        <CarteGraphe titre="Riz collecté (kg / jour)">
          <BarresVerticales
            series={kgParJour}
            couleur={theme.colors.primary}
            unite="kg"
          />
        </CarteGraphe>

        <CarteGraphe titre="Payés vs non payés (nb clients)">
          <BarresHorizontales
            series={[
              { label: 'Payés', valeur: payes, couleur: theme.colors.success },
              { label: 'Non payés', valeur: nonPayes, couleur: theme.colors.error },
            ]}
          />
        </CarteGraphe>

        <CarteGraphe titre="Encaissements (unités propres)">
          <BarresHorizontales
            series={[
              { label: 'Ar', valeur: payeAr, couleur: theme.colors.ar },
              { label: 'Kpk', valeur: payeKpk, couleur: theme.colors.kpk },
            ]}
          />
        </CarteGraphe>

        <CarteGraphe titre="Dettes créées (Ar)">
          <BarresHorizontales
            series={[
              { label: 'Dette+', valeur: montantPlus, couleur: theme.colors.success },
              { label: 'Dette-', valeur: montantMoins, couleur: theme.colors.error },
            ]}
          />
        </CarteGraphe>
      </ScrollView>
    </View>
  );
}

function CarteGraphe({ titre, children }: { titre: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceContainerHigh,
        borderRadius: theme.radius.md,
        padding: theme.spacing.sm,
        gap: theme.spacing.sm,
      }}>
      <Text
        style={{
          fontFamily: theme.fontFamilies.bodyMedium,
          fontSize: theme.fontSizes.labelMd,
          color: theme.colors.onSurfaceVariant,
        }}>
        {titre}
      </Text>
      {children}
    </View>
  );
}

function BarresHorizontales({
  series,
}: {
  series: { label: string; valeur: number; couleur: string }[];
}) {
  const theme = useAppTheme();
  const max = Math.max(...series.map((s) => s.valeur), 1);
  return (
    <View style={{ gap: 8 }}>
      {series.map((s) => (
        <View key={s.label} style={{ gap: 2 }}>
          <Text
            style={{
              fontFamily: theme.fontFamilies.body,
              fontSize: theme.fontSizes.labelMd,
              color: theme.colors.onSurface,
            }}>
            {s.label} · {s.valeur.toLocaleString('fr-FR')}
          </Text>
          <View
            style={{
              height: 12,
              borderRadius: 6,
              backgroundColor: theme.colors.surfaceContainer,
              overflow: 'hidden',
            }}>
            <View
              style={{
                width: `${Math.max(4, (s.valeur / max) * 100)}%`,
                height: '100%',
                backgroundColor: s.couleur,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function BarresVerticales({
  series,
  couleur,
  unite,
}: {
  series: { label: string; valeur: number }[];
  couleur: string;
  unite: string;
}) {
  const theme = useAppTheme();
  const max = Math.max(...series.map((s) => s.valeur), 1);
  if (series.length === 0) {
    return (
      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: theme.fontSizes.labelMd }}>
        Aucune donnée
      </Text>
    );
  }
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 4 }}>
        {series.map((s) => (
          <View key={s.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View
              style={{
                width: '80%',
                height: Math.max(4, (s.valeur / max) * 100),
                backgroundColor: couleur,
                borderRadius: 4,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
        {series.map((s) => (
          <Text
            key={s.label}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 10,
              color: theme.colors.onSurfaceVariant,
            }}
            numberOfLines={1}>
            {s.label}
          </Text>
        ))}
      </View>
      <Text
        style={{
          marginTop: 4,
          fontSize: theme.fontSizes.labelMd,
          color: theme.colors.onSurfaceVariant,
        }}>
        Max {max.toLocaleString('fr-FR')} {unite}
      </Text>
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
      minHeight: 56,
      backgroundColor: theme.colors.surfaceContainer,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    dateBarZone: {
      flex: 1,
      minHeight: 48,
      borderRadius: theme.radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      overflow: 'hidden',
    },
    dateBarText: {
      flex: 1,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurface,
    },
    contenu: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
  });
}
