import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppBar, IconButton, androidRipple } from '@/components/ui/material';
import { listerClientsEntre, type ClientJour } from '@/lib/db/clients';
import { listerDettes, listerIdsCorrections, type Dette } from '@/lib/db/dettes';
import { useAppTheme } from '@/lib/theme/useAppTheme';
import { dateDuJourLocal } from '@/lib/utils/date';
import {
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
  { id: 'annee', label: 'Année' },
  { id: 'intervalle', label: 'Intervalle' },
];

function formaterNombre(n: number, decimales = 0): string {
  return n.toLocaleString('fr-FR', {
    maximumFractionDigits: decimales,
    minimumFractionDigits: decimales,
  });
}

export default function DashboardScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const [granularite, setGranularite] = useState<Granularite>('jour');
  const [pivot, setPivot] = useState(dateDuJourLocal);
  const [intervalle, setIntervalle] = useState<Intervalle>(() => {
    const j = dateDuJourLocal();
    return { debut: j, fin: j };
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
        .catch((error) => {
          console.error('Erreur dashboard :', error);
        });
    }, [bornes.debut, bornes.fin]),
  );

  const kpis = useMemo(() => {
    const nbClients = clients.length;
    const payes = clients.filter((c) => c.statut === 'paye');
    const nonPayes = clients.filter((c) => c.statut === 'non_paye');
    const totalKg = clients.reduce((s, c) => s + c.kg, 0);
    const payeAr = payes
      .filter((c) => c.modePaiement === 'Ar')
      .reduce((s, c) => s + (c.montant ?? 0), 0);
    const payeKpk = payes
      .filter((c) => c.modePaiement === 'Kpk')
      .reduce((s, c) => s + (c.montant ?? 0), 0);
    const moyenne = nbClients > 0 ? totalKg / nbClients : 0;

    const dansPeriode = (iso: string) => {
      const jour = dateLocaleIso(iso);
      return jour >= bornes.debut && jour <= bornes.fin;
    };
    const dettesPeriode = dettes.filter(
      (d) => !corrigees.has(d.id) && !d.correctionDe && dansPeriode(d.createdAt),
    );
    const plus = dettesPeriode.filter((d) => d.type === 'dette_plus');
    const moins = dettesPeriode.filter((d) => d.type === 'dette_moins');

    return {
      nbClients,
      nbPayes: payes.length,
      nbNonPayes: nonPayes.length,
      totalKg,
      moyenne,
      payeAr,
      payeKpk,
      nbDettePlus: plus.length,
      montantDettePlus: plus.reduce((s, d) => s + d.montant, 0),
      nbDetteMoins: moins.length,
      montantDetteMoins: moins.reduce((s, d) => s + d.montant, 0),
    };
  }, [clients, dettes, corrigees, bornes]);

  function revenirAujourdhui() {
    const j = dateDuJourLocal();
    setGranularite('jour');
    setPivot(j);
    setIntervalle({ debut: j, fin: j });
  }
    const suivant = decalerPeriode(granularite, pivot, intervalle, sens);
    setPivot(suivant.pivot);
    setIntervalle(suivant.intervalle);
  }

  return (
    <View style={styles.container}>
      <AppBar title="Tableau de bord" subtitle="Vue d'ensemble du moulin" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}>
        {GRANULARITES.map((g) => (
          <Pressable
            key={g.id}
            android_ripple={androidRipple(theme.colors.ripple)}
            style={[styles.chip, granularite === g.id && styles.chipActif]}
            onPress={() => setGranularite(g.id)}>
            <Text style={[styles.chipTexte, granularite === g.id && styles.chipTexteActif]}>
              {g.label}
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
          <Pressable
            android_ripple={androidRipple(theme.colors.ripple)}
            style={styles.btnAujourdhui}
            onPress={revenirAujourdhui}>
            <Text style={styles.btnAujourdhuiTexte}>Aujourd'hui</Text>
          </Pressable>
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
            if (Platform.OS === 'android') {
              setChoixDate(null);
            }
            if (event.type === 'set' && date) {
              const cle = dateVersCle(date);
              setIntervalle((actuel) =>
                choixDate === 'debut' ? { ...actuel, debut: cle } : { ...actuel, fin: cle },
              );
            }
            if (event.type === 'dismissed') {
              setChoixDate(null);
            }
          }}
        />
      )}

      <Pressable
        android_ripple={androidRipple(theme.colors.ripple)}
        style={styles.btnGraph}
        onPress={() =>
          router.push({
            pathname: '/graphiques',
            params: {
              debut: bornes.debut,
              fin: bornes.fin,
              libelle: libellePeriode(granularite, bornes),
            },
          })
        }>
        <MaterialCommunityIcons name="chart-bar" size={20} color={theme.colors.onPrimary} />
        <Text style={styles.btnGraphTexte}>Accès aux représentations graphiques</Text>
      </Pressable>
        <Text style={styles.section}>Activité</Text>
        <View style={styles.grille}>
          <CarteKpi titre="Clients" valeur={formaterNombre(kpis.nbClients)} />
          <CarteKpi titre="Payés" valeur={formaterNombre(kpis.nbPayes)} accent={theme.colors.success} />
          <CarteKpi
            titre="Non payés"
            valeur={formaterNombre(kpis.nbNonPayes)}
            accent={theme.colors.error}
          />
        </View>

        <Text style={styles.section}>Riz</Text>
        <View style={styles.grille}>
          <CarteKpi titre="Total riz" valeur={`${formaterNombre(kpis.totalKg, 1)} kg`} large />
          <CarteKpi titre="Moyenne / client" valeur={`${formaterNombre(kpis.moyenne, 1)} kg`} />
        </View>

        <Text style={styles.section}>Encaissements</Text>
        <View style={styles.grille}>
          <CarteKpi titre="Payé Ar" valeur={`${formaterNombre(kpis.payeAr)} Ar`} />
          <CarteKpi titre="Payé Kpk" valeur={`${formaterNombre(kpis.payeKpk, 2)} Kpk`} />
        </View>

        <Text style={styles.section}>Dettes créées sur la période</Text>
        <View style={styles.grille}>
          <CarteKpi
            titre={`Dette+ (${kpis.nbDettePlus})`}
            valeur={`${formaterNombre(kpis.montantDettePlus)} Ar`}
            accent={theme.colors.success}
          />
          <CarteKpi
            titre={`Dette- (${kpis.nbDetteMoins})`}
            valeur={`${formaterNombre(kpis.montantDetteMoins)} Ar`}
            accent={theme.colors.error}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function CarteKpi({
  titre,
  valeur,
  accent,
  large,
}: {
  titre: string;
  valeur: string;
  accent?: string;
  large?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View style={[kpiStyles(theme).carte, large && kpiStyles(theme).carteLarge]}>
      <Text style={kpiStyles(theme).titre}>{titre}</Text>
      <Text style={[kpiStyles(theme).valeur, accent ? { color: accent } : null]}>{valeur}</Text>
    </View>
  );
}

function kpiStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    carte: {
      flexGrow: 1,
      flexBasis: '30%',
      backgroundColor: theme.colors.surfaceContainerHigh,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      minHeight: 64,
    },
    carteLarge: {
      flexBasis: '48%',
    },
    titre: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    valeur: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.headlineSm,
      color: theme.colors.onSurface,
      marginTop: 2,
    },
  });
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
    },
    libellePeriode: {
      flex: 1,
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
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    section: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.xs,
    },
    grille: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
  });
}
