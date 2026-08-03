import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useProfilActif } from '@/lib/context/ProfilActifContext';
import { listerClientsDuJour, type ClientJour } from '@/lib/db/clients';
import { useAppTheme } from '@/lib/theme/useAppTheme';
import { dateDuJourLocal } from '@/lib/utils/date';
import { ListeClientsJour } from '@/components/ListeClientsJour';
import { PopupEncaissement } from '@/components/PopupEncaissement';
import { PopupModifierClient } from '@/components/PopupModifierClient';
import { PopupNouveauClient } from '@/components/PopupNouveauClient';

export default function HomeScreen() {
  const { profilActif, definirProfilActif } = useProfilActif();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [refreshKey, setRefreshKey] = useState(0);
  const [popupNouveauVisible, setPopupNouveauVisible] = useState(false);
  const [clientAEncaisser, setClientAEncaisser] = useState<ClientJour | null>(null);
  const [clientAModifier, setClientAModifier] = useState<ClientJour | null>(null);
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

  useEffect(() => {
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
  }, [date, refreshKey]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
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

        <View style={styles.clientsHeader}>
          <Text style={styles.clientsTitre}>Clients du Jour</Text>
          <Text style={styles.clientsTotal}>{nombreClients} Total</Text>
        </View>

        <ListeClientsJour
          refreshKey={refreshKey}
          onClientPresse={(client) => setClientAEncaisser(client)}
          onModifierPresse={(client) => setClientAModifier(client)}
          onSupprimerReussie={() => setRefreshKey((k) => k + 1)}
        />
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setPopupNouveauVisible(true)}>
        <MaterialCommunityIcons name="plus" size={32} color={theme.colors.onPrimary} />
      </Pressable>

      <PopupNouveauClient
        visible={popupNouveauVisible}
        profilNom={profilActif?.nom ?? null}
        onFerme={() => setPopupNouveauVisible(false)}
        onClientAjoute={() => setRefreshKey((k) => k + 1)}
      />
      <PopupEncaissement
        visible={clientAEncaisser !== null}
        client={clientAEncaisser}
        onFerme={() => setClientAEncaisser(null)}
        onEncaisse={() => setRefreshKey((k) => k + 1)}
      />
      <PopupModifierClient
        visible={clientAModifier !== null}
        client={clientAModifier}
        onFermer={() => setClientAModifier(null)}
        onModifieReussi={() => setRefreshKey((k) => k + 1)}
      />
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
    clientsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    clientsTitre: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineSm,
      color: theme.colors.onSurface,
    },
    clientsTotal: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
    },
    fab: {
      position: 'absolute',
      bottom: theme.spacing.xl,
      right: theme.spacing.lg,
      width: 56,
      height: 56,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
