import { randomUUID } from 'expo-crypto';

import { obtenirDeviceId, obtenirProchaineSeq } from './appMeta';
import { openDatabase } from './database';

export type Dette = {
  id: string;
  clientNom: string;
  type: 'dette_plus' | 'dette_moins';
  montant: number;
  motif: string | null;
  origine: 'auto' | 'manuel';
  correctionDe: string | null;
  seq: number;
  deviceId: string;
  createdAt: string;
};

/**
 * Retourne toutes les lignes du journal des dettes, triées par seq croissant.
 * C'est seq (et non createdAt) qui donne l'ordre fiable des mouvements,
 * indépendamment de l'horloge système.
 */
export async function listerDettes(): Promise<Dette[]> {
  const db = await openDatabase();
  return db.getAllAsync<Dette>('SELECT * FROM dettes ORDER BY seq ASC');
}

/**
 * Ajoute un mouvement au journal des dettes.
 * Journal append-only : aucune vérification de doublon, jamais de
 * modification ni de suppression d'une ligne existante, uniquement des
 * ajouts. Le solde d'un client est la somme de ses mouvements.
 */
export async function ajouterDette(params: {
  clientNom: string;
  type: 'dette_plus' | 'dette_moins';
  montant: number;
  motif: string | null;
  origine: 'auto' | 'manuel';
  correctionDe: string | null;
}): Promise<string> {
  const db = await openDatabase();

  const id = randomUUID();
  const seq = await obtenirProchaineSeq();
  const deviceId = await obtenirDeviceId();
  const createdAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO dettes (id, clientNom, type, montant, motif, origine, correctionDe, seq, deviceId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    params.clientNom,
    params.type,
    params.montant,
    params.motif,
    params.origine,
    params.correctionDe,
    seq,
    deviceId,
    createdAt,
  );

  return id;
}
