import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';

import { AppBar, IconButton, TextButton, androidRipple } from '@/components/ui/material';
import { listerClientsEntre, type ClientJour } from '@/lib/db/clients';
import { listerDettes, listerIdsCorrections, type Dette } from '@/lib/db/dettes';
import { useAppTheme } from '@/lib/theme/useAppTheme';
import { dateDuJourLocal } from '@/lib/utils/date';
import {
  ajouterJours,
  calculerBornes,
  cleVersDate,
  dateLocaleIso,
  dateVersCle,
  decalerPeriode,
  libellePeriode,
  type Granularite,
  type Intervalle,
} from '@/lib/utils/periode';

const GRANULARITES: { id: Granularite; label: string }[] = [
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Hebdo' },
  { id: 'mois', label: 'Mois' },
  { id: 'annee', label: 'Années' },
  { id: 'intervalle', label: 'Intervalle' },
];

function nombreJours(debut: string, fin: string): number {
  const [a0, m0, j0] = debut.split('-').map(Number);
  const [a1, m1, j1] = fin.split('-').map(Number);
  return Math.max(1, Math.floor((Date.UTC(a1, m1 - 1, j1) - Date.UTC(a0, m0 - 1, j0)) / 86400000) + 1);
}

function construireSerieRiz(clients: ClientJour[], debut: string, fin: string) {
  const jours = nombreJours(debut, fin);
  const mode = jours <= 62 ? 'jour' : jours <= 730 ? 'mois' : 'annee';
  const valeurs = new Map<string, number>();

  const cleClient = (date: string) =>
    mode === 'jour' ? date : mode === 'mois' ? date.slice(0, 7) : date.slice(0, 4);
  for (const client of clients) {
    const cle = cleClient(client.date);
    valeurs.set(cle, (valeurs.get(cle) ?? 0) + client.kg);
  }

  const cles: string[] = [];
  if (mode === 'jour') {
    for (let date = debut; date <= fin; date = ajouterJours(date, 1)) cles.push(date);
  } else if (mode === 'mois') {
    let [annee, mois] = debut.split('-').map(Number);
    const finMois = fin.slice(0, 7);
    while (`${annee}-${String(mois).padStart(2, '0')}` <= finMois) {
      cles.push(`${annee}-${String(mois).padStart(2, '0')}`);
      mois++;
      if (mois === 13) {
        mois = 1;
        annee++;
      }
    }
  } else {
    const anneeDebut = Number(debut.slice(0, 4));
    const anneeFin = Number(fin.slice(0, 4));
    for (let annee = anneeDebut; annee <= anneeFin; annee++) cles.push(String(annee));
  }

  return cles.map((cle) => {
    let label = cle;
    if (mode === 'jour') {
      label = nombreJours(debut, fin) === 1 ? cle.slice(8) : `${cle.slice(8)}/${cle.slice(5, 7)}`;
    } else if (mode === 'mois') {
      const [annee, mois] = cle.split('-').map(Number);
      label = new Date(annee, mois - 1, 1)
        .toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
        .replace('.', '');
    }
    return { label, valeur: valeurs.get(cle) ?? 0 };
  });
}

export default function GraphiquesScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [granularite, setGranularite] = useState<Granularite>('jour');
  const [pivot, setPivot] = useState(dateDuJourLocal);
  const [intervalle, setIntervalle] = useState<Intervalle>(() => {
    const aujourdHui = dateDuJourLocal();
    return { debut: aujourdHui, fin: aujourdHui };
  });
  const [choixDate, setChoixDate] = useState<'debut' | 'fin' | null>(null);
  const [clients, setClients] = useState<ClientJour[]>([]);
  const [dettes, setDettes] = useState<Dette[]>([]);
  const [corrigees, setCorrigees] = useState<Set<string>>(new Set());

  const bornes = useMemo(
    () => calculerBornes(granularite, pivot, intervalle),
    [granularite, pivot, intervalle],
  );

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        listerClientsEntre(bornes.debut, bornes.fin),
        listerDettes(),
        listerIdsCorrections(),
      ])
        .then(([c, d, ids]) => {
          setClients(c);
          setDettes(d);
          setCorrigees(new Set(ids));
        })
        .catch((error) => console.error('Erreur graphiques :', error));
    }, [bornes.debut, bornes.fin]),
  );

  const serieRiz = useMemo(
    () => construireSerieRiz(clients, bornes.debut, bornes.fin),
    [clients, bornes.debut, bornes.fin],
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
    if (corrigees.has(d.id) || d.correctionDe) return false;
    const jour = dateLocaleIso(d.createdAt);
    return jour >= bornes.debut && jour <= bornes.fin;
  });
  const montantPlus = dettesPeriode
    .filter((d) => d.type === 'dette_plus')
    .reduce((s, d) => s + d.montant, 0);
  const montantMoins = dettesPeriode
    .filter((d) => d.type === 'dette_moins')
    .reduce((s, d) => s + d.montant, 0);

  function aller(sens: -1 | 1) {
    const suivante = decalerPeriode(granularite, pivot, intervalle, sens);
    setPivot(suivante.pivot);
    setIntervalle(suivante.intervalle);
  }

  function revenirAujourdhui() {
    const aujourdHui = dateDuJourLocal();
    setGranularite('jour');
    setPivot(aujourdHui);
    setIntervalle({ debut: aujourdHui, fin: aujourdHui });
  }

  return (
    <View style={styles.container}>
      <AppBar title="Graphiques" subtitle="Représentations par période" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}>
        {GRANULARITES.map((option) => (
          <Pressable
            key={option.id}
            android_ripple={androidRipple(theme.colors.ripple)}
            style={[styles.chip, granularite === option.id && styles.chipActif]}
            onPress={() => setGranularite(option.id)}>
            <Text style={[styles.chipTexte, granularite === option.id && styles.chipTexteActif]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.navPeriode}>
        <IconButton accessibilityLabel="Période précédente" onPress={() => aller(-1)}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.onSurface} />
        </IconButton>
        <View style={styles.centrePeriode}>
          <Text style={styles.libellePeriode} numberOfLines={2}>
            {libellePeriode(granularite, bornes)}
          </Text>
          <TextButton label="Aujourd'hui" onPress={revenirAujourdhui} />
        </View>
        <IconButton accessibilityLabel="Période suivante" onPress={() => aller(1)}>
          <MaterialCommunityIcons name="chevron-right" size={28} color={theme.colors.onSurface} />
        </IconButton>
      </View>

      {granularite === 'intervalle' ? (
        <View style={styles.intervalleRow}>
          <Pressable
            style={styles.dateBtn}
            android_ripple={androidRipple(theme.colors.ripple)}
            onPress={() => setChoixDate('debut')}>
            <Text style={styles.dateBtnLabel}>Du</Text>
            <Text style={styles.dateBtnValeur}>{bornes.debut}</Text>
          </Pressable>
          <Pressable
            style={styles.dateBtn}
            android_ripple={androidRipple(theme.colors.ripple)}
            onPress={() => setChoixDate('fin')}>
            <Text style={styles.dateBtnLabel}>Au</Text>
            <Text style={styles.dateBtnValeur}>{bornes.fin}</Text>
          </Pressable>
        </View>
      ) : null}

      {choixDate && (
        <DateTimePicker
          value={cleVersDate(choixDate === 'debut' ? intervalle.debut : intervalle.fin)}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, date) => {
            if (Platform.OS === 'android') setChoixDate(null);
            if (event.type === 'set' && date) {
              const cle = dateVersCle(date);
              setIntervalle((actuel) =>
                choixDate === 'debut' ? { ...actuel, debut: cle } : { ...actuel, fin: cle },
              );
            }
            if (event.type === 'dismissed') setChoixDate(null);
          }}
        />
      )}

      <ScrollView contentContainerStyle={styles.contenu}>
        <CarteGraphe titre="Riz collecté (kg)">
          <BarresVerticales series={serieRiz} couleur={theme.colors.primary} unite="kg" />
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
    chipsScroll: {
      flexGrow: 0,
      flexShrink: 0,
    },
    chips: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    chip: {
      minHeight: 36,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    chipActif: {
      backgroundColor: theme.colors.primaryContainer,
      borderColor: theme.colors.primary,
    },
    chipTexte: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    chipTexteActif: {
      color: theme.colors.primary,
    },
    navPeriode: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
    },
    centrePeriode: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    libellePeriode: {
      textAlign: 'center',
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurface,
      textTransform: 'capitalize',
    },
    intervalleRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    dateBtn: {
      flex: 1,
      backgroundColor: theme.colors.surfaceContainerHigh,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      overflow: 'hidden',
    },
    dateBtnLabel: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    dateBtnValeur: {
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
