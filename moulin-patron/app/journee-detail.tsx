import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar, IconButton, androidRipple } from '@/components/ui/material';
import { listerClientsDuJour, type ClientJour } from '@/lib/db/clients';
import { useStabiliteClavier } from '@/lib/hooks/useStabiliteClavier';
import { useAppTheme } from '@/lib/theme/useAppTheme';

type Filtre = 'tout' | 'en_attente' | 'paye' | 'non_paye';

export default function JourneeDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const [clients, setClients] = useState<ClientJour[]>([]);
  const [filtre, setFiltre] = useState<Filtre>('tout');
  const [recherche, setRecherche] = useState('');
  const rechercheRef = useRef<TextInput>(null);
  useStabiliteClavier([rechercheRef]);

  useEffect(() => {
    if (!date) {
      return;
    }
    listerClientsDuJour(date)
      .then(setClients)
      .catch((error) => {
        console.error(`Erreur lors du chargement des clients du ${date} :`, error);
      });
  }, [date]);

  const [annee, mois, jour] = (date ?? '').split('-').map(Number);
  const dateLibelle =
    date && !Number.isNaN(annee)
      ? new Date(annee, mois - 1, jour).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : (date ?? '');

  const filtres: { valeur: Filtre; libelle: string }[] = [
    { valeur: 'tout', libelle: 'Tout' },
    { valeur: 'en_attente', libelle: 'En attente' },
    { valeur: 'paye', libelle: 'Payé' },
    { valeur: 'non_paye', libelle: 'Non payé' },
  ];

  const texteRecherche = recherche.trim().toLowerCase();
  const clientsFiltres = clients.filter((c) => {
    if (filtre !== 'tout' && c.statut !== filtre) {
      return false;
    }
    if (!texteRecherche) {
      return true;
    }
    return (
      c.nom.toLowerCase().includes(texteRecherche) ||
      String(c.kg).includes(texteRecherche) ||
      String(c.montant ?? '').includes(texteRecherche)
    );
  });

  function couleurBordure(client: ClientJour): string {
    if (client.statut === 'en_attente') {
      return theme.colors.warning;
    }
    if (client.statut === 'paye') {
      return client.modePaiement === 'Ar' ? theme.colors.ar : theme.colors.kpk;
    }
    return theme.colors.error;
  }

  return (
    <View style={styles.container}>
      <AppBar
        title={dateLibelle}
        subtitle={`${clients.length} client${clients.length > 1 ? 's' : ''}`}
        left={
          <IconButton accessibilityLabel="Retour" onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.onSurface} />
          </IconButton>
        }
      />

      <View style={styles.rechercheWrap}>
        <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.onSurfaceVariant} />
        <TextInput
          style={styles.recherche}
          value={recherche}
          onChangeText={setRecherche}
          placeholder="Rechercher (nom, kg)"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          ref={rechercheRef}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtresScroll}
        contentContainerStyle={styles.filtresBarre}>
        {filtres.map((f) => (
          <Pressable
            key={f.valeur}
            android_ripple={androidRipple(theme.colors.ripple)}
            style={[styles.filtre, filtre === f.valeur && styles.filtreActif]}
            onPress={() => setFiltre(f.valeur)}>
            <Text style={[styles.filtreText, filtre === f.valeur && styles.filtreTextActif]}>
              {f.libelle}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.listeContenu}>
        {clientsFiltres.length === 0 ? (
          <Text style={styles.vide}>Aucun client</Text>
        ) : (
          clientsFiltres.map((client) => (
            <View
              key={client.id}
              style={[styles.carte, { borderLeftColor: couleurBordure(client) }]}>
              <View style={styles.carteGauche}>
                <Text style={styles.carteNom}>{client.nom}</Text>
                <Text style={styles.carteDetail}>{client.kg} kg</Text>
              </View>
              <View style={styles.carteDroite}>
                {client.statut === 'paye' ? (
                  <Text style={styles.payeText}>
                    Payé
                    {client.montant !== null
                      ? ` · ${client.montant} ${client.modePaiement === 'Kpk' ? 'Kpk' : 'Ar'}`
                      : ''}
                  </Text>
                ) : null}
                {client.statut === 'non_paye' ? (
                  <Text style={styles.nonPayeText}>Non payé</Text>
                ) : null}
                {client.statut === 'en_attente' ? (
                  <Text style={styles.attenteText}>En attente</Text>
                ) : null}
              </View>
            </View>
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
    rechercheWrap: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
      minHeight: 44,
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.surfaceContainerHigh,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    recherche: {
      flex: 1,
      minHeight: 44,
      color: theme.colors.onSurface,
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
    },
    filtresScroll: {
      flexGrow: 0,
      flexShrink: 0,
    },
    filtresBarre: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xs,
      gap: theme.spacing.sm,
      alignItems: 'center',
    },
    filtre: {
      minHeight: 36,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    filtreActif: {
      backgroundColor: theme.colors.primaryContainer,
      borderColor: theme.colors.primary,
    },
    filtreText: {
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fontFamilies.bodyMedium,
    },
    filtreTextActif: {
      color: theme.colors.primary,
    },
    scroll: {
      flex: 1,
    },
    listeContenu: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
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
      ...theme.elevation.card,
    },
    carteGauche: {
      flex: 1,
      gap: 2,
    },
    carteNom: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurface,
    },
    carteDetail: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    carteDroite: {
      alignItems: 'flex-end',
    },
    payeText: {
      color: theme.colors.success,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
    },
    nonPayeText: {
      color: theme.colors.error,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
    },
    attenteText: {
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.labelMd,
    },
  });
}
