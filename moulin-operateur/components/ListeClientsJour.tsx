import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { MenuActionClient } from '@/components/MenuActionClient';
import { androidRipple } from '@/components/ui/material';
import { listerClientsDuJour, supprimerClient, type ClientJour } from '@/lib/db/clients';
import { useStabiliteClavier } from '@/lib/hooks/useStabiliteClavier';
import { useAppTheme } from '@/lib/theme/useAppTheme';
import { dateDuJourLocal } from '@/lib/utils/date';

type Filtre = 'tout' | 'en_attente' | 'paye_kpk' | 'paye_ar';

export function ListeClientsJour({
  dateAffichee,
  refreshKey,
  onClientPresse,
  onModifierPresse,
  onSupprimerReussie,
  onDettePresse,
}: {
  dateAffichee: string;
  refreshKey: number;
  onClientPresse: (client: ClientJour) => void;
  onModifierPresse: (client: ClientJour) => void;
  onSupprimerReussie: () => void;
  onDettePresse: (client: ClientJour) => void;
}) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [clients, setClients] = useState<ClientJour[]>([]);
  const [filtre, setFiltre] = useState<Filtre>('en_attente');
  const [recherche, setRecherche] = useState('');
  const [clientMenuOuvert, setClientMenuOuvert] = useState<ClientJour | null>(null);
  const rechercheRef = useRef<TextInput>(null);
  useStabiliteClavier([rechercheRef]);
  const lectureSeule = dateAffichee < dateDuJourLocal();

  useEffect(() => {
    listerClientsDuJour(dateAffichee)
      .then(setClients)
      .catch((error) => {
        console.error('Erreur lors du chargement des clients :', error);
      });
  }, [dateAffichee, refreshKey]);

  function rechargerListe() {
    listerClientsDuJour(dateAffichee)
      .then(setClients)
      .catch((error) => {
        console.error('Erreur lors du rechargement des clients :', error);
      });
  }

  function heureAffichee(createdAt: string): string {
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function ouvrirMenuClient(client: ClientJour) {
    if (client.statut !== 'en_attente') {
      return;
    }
    setClientMenuOuvert(client);
  }

  function confirmerSuppression(client: ClientJour) {
    Alert.alert('Confirmer la suppression', `Supprimer ${client.nom} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await supprimerClient(client.id);
            rechargerListe();
            onSupprimerReussie();
          } catch (error) {
            Alert.alert('Erreur', error instanceof Error ? error.message : String(error));
          }
        },
      },
    ]);
  }

  function couleurBordure(client: ClientJour): string {
    if (client.statut === 'en_attente') {
      return theme.colors.warning;
    }
    if (client.statut === 'paye') {
      return client.modePaiement === 'Ar' ? theme.colors.ar : theme.colors.kpk;
    }
    return theme.colors.error;
  }

  const filtres: { valeur: Filtre; libelle: string }[] = [
    { valeur: 'tout', libelle: 'Tout' },
    { valeur: 'en_attente', libelle: 'En attente' },
    { valeur: 'paye_kpk', libelle: 'Payé riz' },
    { valeur: 'paye_ar', libelle: 'Payé argent' },
  ];

  const texteRecherche = recherche.trim().toLowerCase();
  const clientsFiltres = clients.filter((c) => {
    let correspondOnglet = true;
    if (filtre === 'en_attente') {
      correspondOnglet = c.statut === 'en_attente';
    } else if (filtre === 'paye_ar') {
      correspondOnglet = c.statut === 'paye' && c.modePaiement === 'Ar';
    } else if (filtre === 'paye_kpk') {
      correspondOnglet = c.statut === 'paye' && c.modePaiement === 'Kpk';
    }
    if (!correspondOnglet) {
      return false;
    }
    if (!texteRecherche) {
      return true;
    }
    const nomOK = c.nom.toLowerCase().includes(texteRecherche);
    const heureOK = heureAffichee(c.createdAt).toLowerCase().includes(texteRecherche);
    const kgOK = String(c.kg).includes(texteRecherche);
    return nomOK || heureOK || kgOK;
  });

  return (
    <View style={styles.container}>
      <View style={styles.rechercheWrap}>
        <MaterialCommunityIcons name="magnify" size={22} color={theme.colors.onSurfaceVariant} />
        <TextInput
          style={styles.recherche}
          value={recherche}
          onChangeText={setRecherche}
          placeholder="Rechercher (nom, heure, kg)"
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

      {!lectureSeule ? (
        <Text style={styles.indice}>Touchez pour encaisser · Appui long pour modifier</Text>
      ) : null}

      <ScrollView
        style={styles.listeScroll}
        contentContainerStyle={styles.listeContenu}>
        {clientsFiltres.length === 0 ? (
          <Text style={styles.vide}>Aucun client pour l&apos;instant</Text>
        ) : (
          clientsFiltres.map((c) => (
            <Pressable
              key={c.id}
              android_ripple={androidRipple(theme.colors.ripple)}
              disabled={
                lectureSeule
                  ? c.statut !== 'non_paye'
                  : c.statut !== 'en_attente'
              }
              onPress={
                lectureSeule && c.statut === 'non_paye'
                  ? () => onDettePresse(c)
                  : c.statut === 'en_attente'
                    ? () => onClientPresse(c)
                    : undefined
              }
              onLongPress={
                lectureSeule
                  ? undefined
                  : c.statut === 'en_attente'
                    ? () => ouvrirMenuClient(c)
                    : undefined
              }
              style={[
                styles.carte,
                { borderLeftColor: couleurBordure(c) },
              ]}>
              <View style={styles.carteGauche}>
                <Text style={styles.carteNom}>{c.nom}</Text>
                <Text style={styles.carteDetail}>
                  {c.kg} kg · {heureAffichee(c.createdAt)}
                </Text>
              </View>
              <View style={styles.carteDroite}>
                {c.statut === 'en_attente' &&
                  (lectureSeule ? (
                    <Text style={styles.enAttenteText}>En attente</Text>
                  ) : (
                    <View style={styles.boutonPayer}>
                      <MaterialCommunityIcons
                        name="cash"
                        size={22}
                        color={theme.colors.onPrimary}
                      />
                    </View>
                  ))}
                {c.statut === 'paye' && (
                  <Text style={styles.payeText}>
                    {c.montant !== null
                      ? `Payé · ${c.montant} ${c.modePaiement === 'Kpk' ? 'Kpk' : 'Ar'}`
                      : 'Payé'}
                  </Text>
                )}
                {c.statut === 'non_paye' && (
                  <MaterialCommunityIcons
                    name={lectureSeule ? 'cash' : 'hand-coin'}
                    size={24}
                    color={lectureSeule ? theme.colors.primary : theme.colors.error}
                  />
                )}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <MenuActionClient
        visible={clientMenuOuvert !== null}
        nomClient={clientMenuOuvert?.nom ?? null}
        onFermer={() => setClientMenuOuvert(null)}
        onPayer={() => {
          if (clientMenuOuvert) onClientPresse(clientMenuOuvert);
        }}
        onModifier={() => {
          if (clientMenuOuvert) onModifierPresse(clientMenuOuvert);
        }}
        onSupprimer={() => {
          const client = clientMenuOuvert;
          setClientMenuOuvert(null);
          if (client) {
            setTimeout(() => confirmerSuppression(client), 250);
          }
        }}
      />
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    rechercheWrap: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
      minHeight: 48,
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.surfaceContainerHigh,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    recherche: {
      flex: 1,
      minHeight: 48,
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
      minHeight: 40,
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
    indice: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    listeScroll: {
      flex: 1,
    },
    listeContenu: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: 80,
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
      gap: theme.spacing.xs,
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
      alignItems: 'center',
    },
    boutonPayer: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    payeText: {
      color: theme.colors.success,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
    },
    enAttenteText: {
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.labelMd,
    },
    vide: {
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      textAlign: 'center',
      paddingVertical: theme.spacing.xl,
    },
  });
}
