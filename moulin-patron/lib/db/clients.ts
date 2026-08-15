import { randomUUID } from 'expo-crypto';

import { obtenirDeviceId, obtenirProchaineSeq } from './appMeta';
import { openDatabase } from './database';
import { ajouterDette } from './dettes';
import { lireTarifs } from './tarifs';
import { dateDuJourLocal } from '../utils/date';

const TARIF_AR_PAR_KG_DEFAUT = 100;
const TARIF_AR_PAR_KPK_DEFAUT = 500;

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
  tarifArParKg: number;
  tarifArParKpk: number;
  updatedAt: string;
  updatedByDeviceId: string;
  supprime: 0 | 1;
  supprimeAt: string | null;
};

/** Les suppressions sont masquées dans l'interface mais incluses dans les exports. */
export async function listerClientsDuJour(
  date: string,
  inclureSupprimes = false,
): Promise<ClientJour[]> {
  const db = await openDatabase();
  return db.getAllAsync<ClientJour>(
    `SELECT * FROM clients_jour WHERE date = ?${inclureSupprimes ? '' : ' AND supprime = 0'} ORDER BY createdAt ASC`,
    date,
  );
}

/** Clients dont la date de journée est entre debut et fin (inclus, AAAA-MM-JJ). */
export async function listerClientsEntre(debut: string, fin: string): Promise<ClientJour[]> {
  const db = await openDatabase();
  return db.getAllAsync<ClientJour>(
    `SELECT * FROM clients_jour
      WHERE date >= ? AND date <= ? AND supprime = 0
      ORDER BY date ASC, createdAt ASC`,
    debut,
    fin,
  );
}

export type Jour = {
  date: string;
  totalClients: number;
  totalKg: number;
  nonPaye: number;
};

export async function listerJours(): Promise<Jour[]> {
  const db = await openDatabase();
  return db.getAllAsync<Jour>(
    `SELECT date, COUNT(*) AS totalClients, COALESCE(SUM(kg), 0) AS totalKg,
            COALESCE(SUM(CASE WHEN statut = 'non_paye' THEN 1 ELSE 0 END), 0) AS nonPaye
       FROM clients_jour WHERE supprime = 0 GROUP BY date ORDER BY date DESC`,
  );
}

export async function ajouterClient(params: {
  date: string;
  nom: string;
  kg: number;
  profilNom: string | null;
}): Promise<string> {
  const db = await openDatabase();
  const doublon = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM clients_jour
      WHERE date = ? AND supprime = 0 AND LOWER(TRIM(nom)) = LOWER(TRIM(?))`,
    params.date,
    params.nom,
  );
  if (doublon) throw new Error('Ce nom de client existe déjà pour cette date.');

  const tarifs = await lireTarifs();
  const id = randomUUID();
  const seq = await obtenirProchaineSeq();
  const deviceId = await obtenirDeviceId();
  const maintenant = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO clients_jour
       (id, date, nom, kg, modePaiement, montant, statut, profilNom, seq, deviceId,
        createdAt, encaisseAt, tarifArParKg, tarifArParKpk, updatedAt, updatedByDeviceId,
        supprime, supprimeAt)
     VALUES (?, ?, ?, ?, NULL, NULL, 'en_attente', ?, ?, ?, ?, NULL, ?, ?, ?, ?, 0, NULL)`,
    id,
    params.date,
    params.nom,
    params.kg,
    params.profilNom,
    seq,
    deviceId,
    maintenant,
    tarifs?.arParKg ?? TARIF_AR_PAR_KG_DEFAUT,
    tarifs?.arParKpk ?? TARIF_AR_PAR_KPK_DEFAUT,
    maintenant,
    deviceId,
  );
  return id;
}

export async function encaisserClient(params: {
  id: string;
  modePaiement: string;
  montant: number;
  statut: 'paye' | 'non_paye';
}): Promise<void> {
  const db = await openDatabase();
  const deviceId = await obtenirDeviceId();
  const maintenant = new Date().toISOString();
  const resultat = await db.runAsync(
    `UPDATE clients_jour
        SET modePaiement = ?, montant = ?, statut = ?, encaisseAt = ?,
            updatedAt = ?, updatedByDeviceId = ?
      WHERE id = ? AND statut = 'en_attente' AND supprime = 0`,
    params.modePaiement,
    params.montant,
    params.statut,
    maintenant,
    maintenant,
    deviceId,
    params.id,
  );
  if (resultat.changes === 0) throw new Error("Ce client n'est plus en attente de paiement.");
}

export async function modifierClient(params: { id: string; nom: string; kg: number }): Promise<void> {
  const db = await openDatabase();
  const client = await db.getFirstAsync<{ date: string; statut: string; supprime: number }>(
    'SELECT date, statut, supprime FROM clients_jour WHERE id = ?',
    params.id,
  );
  if (!client || client.statut !== 'en_attente' || client.supprime === 1) {
    throw new Error('Seul un client en attente peut être modifié.');
  }
  const doublon = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM clients_jour
      WHERE date = ? AND supprime = 0 AND LOWER(TRIM(nom)) = LOWER(TRIM(?)) AND id != ?`,
    client.date,
    params.nom,
    params.id,
  );
  if (doublon) throw new Error('Ce nom de client existe déjà pour cette date.');

  await db.runAsync(
    'UPDATE clients_jour SET nom = ?, kg = ?, updatedAt = ?, updatedByDeviceId = ? WHERE id = ?',
    params.nom,
    params.kg,
    new Date().toISOString(),
    await obtenirDeviceId(),
    params.id,
  );
}

/** Suppression logique synchronisable : la ligne reste dans le journal CSV. */
export async function supprimerClient(id: string): Promise<void> {
  const db = await openDatabase();
  const maintenant = new Date().toISOString();
  const resultat = await db.runAsync(
    `UPDATE clients_jour
        SET supprime = 1, supprimeAt = ?, updatedAt = ?, updatedByDeviceId = ?
      WHERE id = ? AND statut = 'en_attente' AND supprime = 0`,
    maintenant,
    maintenant,
    await obtenirDeviceId(),
    id,
  );
  if (resultat.changes === 0) throw new Error('Seul un client en attente peut être supprimé.');
}

export async function cloturerJoursPrecedents(): Promise<number> {
  const db = await openDatabase();
  const enAttente = await db.getAllAsync<{
    id: string;
    nom: string;
    kg: number;
    tarifArParKg: number | null;
  }>(
    `SELECT id, nom, kg, tarifArParKg FROM clients_jour
      WHERE statut = 'en_attente' AND supprime = 0 AND date < ?`,
    dateDuJourLocal(),
  );
  const deviceId = await obtenirDeviceId();
  let traites = 0;

  for (const client of enAttente) {
    try {
      const montant = client.kg * (client.tarifArParKg ?? TARIF_AR_PAR_KG_DEFAUT);
      const maintenant = new Date().toISOString();
      await db.runAsync(
        `UPDATE clients_jour SET modePaiement = 'Ar', montant = ?, statut = 'non_paye',
          encaisseAt = ?, updatedAt = ?, updatedByDeviceId = ? WHERE id = ?`,
        montant,
        maintenant,
        maintenant,
        deviceId,
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
      try {
        await db.runAsync(
          `UPDATE clients_jour SET statut = 'en_attente', modePaiement = NULL, montant = NULL,
            encaisseAt = NULL, updatedAt = ?, updatedByDeviceId = ? WHERE id = ?`,
          new Date().toISOString(),
          deviceId,
          client.id,
        );
      } catch (secondaire) {
        console.error(`Échec de la restauration du client ${client.id} :`, secondaire);
      }
      console.error(`Erreur lors de la clôture du client ${client.id} (${client.nom}) :`, error);
    }
  }
  return traites;
}
