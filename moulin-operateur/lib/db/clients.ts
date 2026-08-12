import { randomUUID } from 'expo-crypto';

import { obtenirDeviceId, obtenirProchaineSeq } from './appMeta';
import { openDatabase } from './database';
import { ajouterDette } from './dettes';
import { lireTarifs } from './tarifs';
import { dateDuJourLocal } from '../utils/date';

export type ClientJour = {
  id: string;
  date: string;
  nom: string;
  kg: number;
  modePaiement: string | null;
  montant: number | null;
  statut: 'en_attente' | 'paye' | 'non_paye';
  profilNom: string | null;
  seq: number;
  deviceId: string;
  createdAt: string;
  encaisseAt: string | null;
};

/**
 * Étape 1 (accueil) : seul le nom et le kg sont saisis, le client est créé
 * avec le statut "en_attente" (modePaiement, montant et encaisseAt vides).
 * Étape 2 (encaissement) : encaisserClient() renseigne ensuite le mode de
 * paiement, le montant et le statut final.
 */
export async function listerClientsDuJour(date: string): Promise<ClientJour[]> {
  const db = await openDatabase();
  return db.getAllAsync<ClientJour>(
    'SELECT * FROM clients_jour WHERE date = ? ORDER BY createdAt ASC',
    date,
  );
}

export type Jour = {
  date: string;
  totalClients: number;
  totalKg: number;
  nonPaye: number;
};

/**
 * Liste les journées ayant des clients (dates distinctes) avec quelques
 * agrégats par jour. Utilisé par l'application Patron pour la supervision
 * des journées importées.
 */
export async function listerJours(): Promise<Jour[]> {
  const db = await openDatabase();
  return db.getAllAsync<Jour>(
    `SELECT date,
            COUNT(*) AS totalClients,
            COALESCE(SUM(kg), 0) AS totalKg,
            COALESCE(SUM(CASE WHEN statut = 'non_paye' THEN 1 ELSE 0 END), 0) AS nonPaye
     FROM clients_jour
     GROUP BY date
     ORDER BY date DESC`,
  );
}

/**
 * Ajoute un client à la journée (étape 1 : accueil, statut "en_attente").
 * Règle de blocage : un même nom ne peut pas apparaître deux fois pour une
 * même date (comparaison insensible à la casse et aux espaces en début/fin).
 */
export async function ajouterClient(params: {
  date: string;
  nom: string;
  kg: number;
  profilNom: string | null;
}): Promise<string> {
  const db = await openDatabase();

  const doublon = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM clients_jour WHERE date = ? AND LOWER(TRIM(nom)) = LOWER(TRIM(?))',
    params.date,
    params.nom,
  );
  if (doublon) {
    throw new Error('Ce nom de client existe déjà pour cette date.');
  }

  const id = randomUUID();
  const seq = await obtenirProchaineSeq();
  const deviceId = await obtenirDeviceId();
  const createdAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO clients_jour (id, date, nom, kg, modePaiement, montant, statut, profilNom, seq, deviceId, createdAt, encaisseAt)
     VALUES (?, ?, ?, ?, NULL, NULL, 'en_attente', ?, ?, ?, ?, NULL)`,
    id,
    params.date,
    params.nom,
    params.kg,
    params.profilNom,
    seq,
    deviceId,
    createdAt,
  );

  return id;
}

/**
 * Étape 2 (encaissement) : met à jour la ligne du client avec le mode de
 * paiement, le montant et le statut final, et enregistre la date
 * d'encaissement. C'est une mise à jour normale de la ligne (pas une
 * correction) : les autres colonnes (nom, kg, date, seq...) restent
 * inchangées.
 */
export async function encaisserClient(params: {
  id: string;
  modePaiement: string;
  montant: number;
  statut: 'paye' | 'non_paye';
}): Promise<void> {
  const db = await openDatabase();

  const client = await db.getFirstAsync<{ statut: string }>(
    'SELECT statut FROM clients_jour WHERE id = ?',
    params.id,
  );
  if (!client || client.statut !== 'en_attente') {
    throw new Error('Ce client n\'est plus en attente de paiement.');
  }

  await db.runAsync(
    'UPDATE clients_jour SET modePaiement = ?, montant = ?, statut = ?, encaisseAt = ? WHERE id = ?',
    params.modePaiement,
    params.montant,
    params.statut,
    new Date().toISOString(),
    params.id,
  );
}

/**
 * Modifie le nom et/ou le kg d'un client, uniquement si son statut est
 * encore "en_attente" (un client encaissé ne se corrige pas par ici).
 * Reprend la règle de doublon d'ajouterClient : le nouveau nom ne doit pas
 * exister pour la même date, en excluant ce client lui-même.
 */
export async function modifierClient(params: {
  id: string;
  nom: string;
  kg: number;
}): Promise<void> {
  const db = await openDatabase();

  const client = await db.getFirstAsync<{
    id: string;
    nom: string;
    date: string;
    statut: string;
  }>('SELECT id, nom, date, statut FROM clients_jour WHERE id = ?', params.id);

  if (!client || client.statut !== 'en_attente') {
    throw new Error('Seul un client en attente peut être modifié.');
  }

  const doublon = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM clients_jour WHERE date = ? AND LOWER(TRIM(nom)) = LOWER(TRIM(?)) AND id != ?',
    client.date,
    params.nom,
    params.id,
  );
  if (doublon) {
    throw new Error('Ce nom de client existe déjà pour cette date.');
  }

  await db.runAsync('UPDATE clients_jour SET nom = ?, kg = ? WHERE id = ?', params.nom, params.kg, params.id);
}

/**
 * Supprime un client, uniquement si son statut est encore "en_attente"
 * (un client encaissé reste dans le journal de la journée).
 */
export async function supprimerClient(id: string): Promise<void> {
  const db = await openDatabase();

  const client = await db.getFirstAsync<{ statut: string }>(
    'SELECT statut FROM clients_jour WHERE id = ?',
    id,
  );

  if (!client || client.statut !== 'en_attente') {
    throw new Error('Seul un client en attente peut être supprimé.');
  }

  await db.runAsync('DELETE FROM clients_jour WHERE id = ?', id);
}

/**
 * Clôture automatique de fin de journée : tout client resté "en_attente"
 * sur un jour précédent est transformé en "non_paye" avec le montant
 * calculé sur les tarifs actuels (kg × arParKg, en Ar), et une Dette+
 * (origine "auto") est créée pour lui. Retourne le nombre de clients
 * traités. Une erreur sur un client est loggée mais ne bloque pas les
 * suivants.
 */
export async function cloturerJoursPrecedents(): Promise<number> {
  const db = await openDatabase();
  const dateDuJour = dateDuJourLocal();

  const enAttente = await db.getAllAsync<{ id: string; nom: string; kg: number }>(
    "SELECT id, nom, kg FROM clients_jour WHERE statut = 'en_attente' AND date < ?",
    dateDuJour,
  );

  const tarifs = await lireTarifs();
  const arParKg = tarifs?.arParKg ?? 100;

  let traites = 0;
  for (const client of enAttente) {
    try {
      const montant = client.kg * arParKg;
      await db.runAsync(
        "UPDATE clients_jour SET modePaiement = 'Ar', montant = ?, statut = 'non_paye', encaisseAt = ? WHERE id = ?",
        montant,
        new Date().toISOString(),
        client.id,
      );
      await ajouterDette({
        clientNom: client.nom,
        type: 'dette_plus',
        montant,
        motif: 'Non payé - clôture automatique',
        origine: 'auto',
        correctionDe: null,
        clientJourId: client.id,
      });
      traites++;
    } catch (error) {
      // Si la création de la dette échoue, on restaure le client en
      // "en_attente" : sinon il resterait "non_paye" sans dette associée et
      // ne serait plus jamais retraité par la clôture suivante.
      try {
        await db.runAsync(
          "UPDATE clients_jour SET statut = 'en_attente', modePaiement = NULL, montant = NULL, encaisseAt = NULL WHERE id = ?",
          client.id,
        );
      } catch (secondaire) {
        console.error(
          `Échec de la restauration du client ${client.id} (${client.nom}) :`,
          secondaire,
        );
      }
      console.error(
        `Erreur lors de la clôture du client ${client.id} (${client.nom}) :`,
        error,
      );
    }
  }

  return traites;
}
