import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuActionClient } from '@/components/MenuActionClient';
import { listerClientsDuJour, supprimerClient, type ClientJour } from '@/lib/db/clients';
import { useStabiliteClavier } from '@/lib/hooks/useStabiliteClavier';
import { useAppTheme } from '@/lib/theme/useAppTheme';
import { dateDuJourLocal } from '@/lib/utils/date';

type Filtre = 'tout' | 'en_attente' | 'paye_kpk' | 'paye_ar';

/**
 * Affiche la liste des clients déjà enregistrés pour la journée en cours.
 * Le parent incrémente refreshKey à chaque nouvel enregistrement pour
 * déclencher un rechargement automatique.
 * Le tap sur la carte ne fait rien ; seul le bouton rond "cash" (statut
 * "en_attente") ouvre le paiement. Le long-press sur une carte
 * "en_attente" ouvre le MenuActionClient (Payer / Modifier / Supprimer).
 * En lecture seule (date passée), les cartes "paye" restent inertes mais
 * les cartes "non_paye" sont tappables pour rembourser leur dette
 * automatique (via onDettePresse). La barre de filtres est fixe en bas
 * du composant.
 */
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
  const insets = useSafeAreaInsets();
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

  // Rechargement local (après suppression) sans attendre le parent.
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

  // Confirmation de suppression : toujours une Alert.alert natif.
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

  // Couleur de la bordure gauche de la carte selon le statut.
  function couleurBordure(client: ClientJour): string {
    if (client.statut === 'en_attente') {
      return theme.colors.warning;
    }
    if (client.statut === 'paye') {
      return client.modePaiement === 'Ar' ? theme.colors.ar : theme.colors.kpk;
    }
    return theme.colors.error;
  }

  // Filtres d'affichage : ordre et libellés exacts, partagés en bas d'écran.
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
      <TextInput
        style={styles.recherche}
        value={recherche}
        onChangeText={setRecherche}
        placeholder="Rechercher (nom, heure, kg)"
        placeholderTextColor={theme.colors.onSurfaceVariant}
        ref={rechercheRef}
      />

      <ScrollView style={styles.listeScroll} contentContainerStyle={styles.listeContenu}>
        {clientsFiltres.length === 0 ? (
          <Text style={styles.vide}>Aucun client pour l&apos;instant</Text>
        ) : (
          clientsFiltres.map((c) => (
            <Pressable
              key={c.id}
              disabled={
                lectureSeule
                  ? c.statut !== 'non_paye'
                  : c.statut !== 'en_attente'
              }
              onPress={
                lectureSeule && c.statut === 'non_paye'
                  ? () => onDettePresse(c)
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
                    <Pressable style={styles.boutonPayer} onPress={() => onClientPresse(c)}>
                      <MaterialCommunityIcons
                        name="cash"
                        size={20}
                        color={theme.colors.onPrimary}
                      />
                    </Pressable>
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
                    size={22}
                    color={lectureSeule ? theme.colors.primary : theme.colors.error}
                  />
                )}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <View
        style={[
          styles.filtresBarre,
          { paddingBottom: theme.spacing.sm + insets.bottom },
        ]}>
        {filtres.map((f) => (
          <Pressable
            key={f.valeur}
            style={[styles.filtre, filtre === f.valeur && styles.filtreActif]}
            onPress={() => setFiltre(f.valeur)}>
            <Text style={[styles.filtreText, filtre === f.valeur && styles.filtreTextActif]}>
              {f.libelle}
            </Text>
          </Pressable>
        ))}
      </View>

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
          if (clientMenuOuvert) confirmerSuppression(clientMenuOuvert);
        }}
      />
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    listeScroll: {
      flex: 1,
    },
    listeContenu: {
      paddingBottom: theme.spacing.sm,
    },
    recherche: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      color: theme.colors.onSurface,
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      marginBottom: theme.spacing.sm,
    },
    carte: {
      backgroundColor: theme.colors.surfaceContainer,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      borderLeftWidth: 3,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
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
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    payeText: {
      color: theme.colors.success,
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.bodyMd,
    },
    enAttenteText: {
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
    },
    vide: {
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      textAlign: 'center',
      paddingVertical: theme.spacing.xl,
    },
    filtresBarre: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline,
      padding: theme.spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: theme.spacing.sm,
    },
    filtre: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      backgroundColor: 'transparent',
      alignItems: 'center',
    },
    filtreActif: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filtreText: {
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fontFamilies.body,
    },
    filtreTextActif: {
      color: theme.colors.onPrimary,
      fontFamily: theme.fontFamilies.bodyMedium,
    },
  });
}
