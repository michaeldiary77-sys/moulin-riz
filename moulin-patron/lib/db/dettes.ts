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
  clientJourId: string | null;
  remboursee: 0 | 1;
  rembourseeAt: string | null;
  seq: number;
  deviceId: string;
  createdAt: string;
};

/**
 * Retourne toutes les lignes du journal des dettes, triées par createdAt
 * croissant (seq en départage). C'est l'ordre chronologique réel : seq est
 * un compteur propre à chaque appareil et ne peut pas ordonner des
 * mouvements venus de plusieurs appareils après un échange de fichiers.
 */
export async function listerDettes(): Promise<Dette[]> {
  const db = await openDatabase();
  return db.getAllAsync<Dette>('SELECT * FROM dettes ORDER BY createdAt ASC, seq ASC');
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
  clientJourId: string | null;
}): Promise<string> {
  const db = await openDatabase();

  const id = randomUUID();
  const seq = await obtenirProchaineSeq();
  const deviceId = await obtenirDeviceId();
  const createdAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO dettes (id, clientNom, type, montant, motif, origine, correctionDe, clientJourId, remboursee, rembourseeAt, seq, deviceId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?)`,
    id,
    params.clientNom,
    params.type,
    params.montant,
    params.motif,
    params.origine,
    params.correctionDe,
    params.clientJourId,
    seq,
    deviceId,
    createdAt,
  );

  return id;
}

/**
 * Marque une dette (Dette+ ou Dette-) comme remboursée (montant complet,
 * une seule fois). Une Dette+ = argent entrant au remboursement (on nous
 * doit). Une Dette- = argent sortant au remboursement (nous devons).
 * L'UPDATE est conditionnel (remboursee = 0) : si la ligne a déjà été
 * remboursée, aucun changement n'est fait et la fonction retourne false
 * (protection contre les doubles clics/répétition).
 * Si la dette est liée à un client du jour (clientJourId, dettes auto de
 * clôture), le client passe aussi au statut "paye" dans clients_jour.
 */
export async function rembourserDette(id: string): Promise<boolean> {
  const db = await openDatabase();

  const resultat = await db.runAsync(
    'UPDATE dettes SET remboursee = 1, rembourseeAt = ? WHERE id = ? AND remboursee = 0',
    new Date().toISOString(),
    id,
  );
  if (resultat.changes === 0) {
    return false;
  }

  const dette = await db.getFirstAsync<{ clientJourId: string | null }>(
    'SELECT clientJourId FROM dettes WHERE id = ?',
    id,
  );
  if (dette?.clientJourId) {
    await db.runAsync(
      "UPDATE clients_jour SET statut = 'paye' WHERE id = ? AND statut = 'non_paye'",
      dette.clientJourId,
    );
  }

  return true;
}

/**
 * Retourne la dette (automatique de clôture) liée à un client du jour
 * donné, en privilégiant une dette encore non remboursée.
 */
export async function trouverDetteClient(clientJourId: string): Promise<Dette | null> {
  const db = await openDatabase();
  return db.getFirstAsync<Dette>(
    'SELECT * FROM dettes WHERE clientJourId = ? ORDER BY remboursee ASC, seq ASC',
    clientJourId,
  );
}

/**
 * Retourne les identifiants des mouvements de dettes liés à une correction :
 * à la fois les mouvements d'origine annulés (ciblés par correctionDe) et les
 * contre-mouvements eux-mêmes. L'un sans l'autre n'a pas de sens : ils sont
 * inertes ensemble, ne doivent plus compter dans les totaux ni être
 * remboursables.
 */
export async function listerIdsCorrections(): Promise<string[]> {
  const db = await openDatabase();
  const lignes = await db.getAllAsync<{ id: string; correctionDe: string | null }>(
    'SELECT id, correctionDe FROM dettes WHERE correctionDe IS NOT NULL',
  );
  const ids = new Set<string>();
  for (const ligne of lignes) {
    ids.add(ligne.id);
    if (ligne.correctionDe) {
      ids.add(ligne.correctionDe);
    }
  }
  return [...ids];
}

/**
 * Annule une dette saisie par erreur (montant ou personne erronés). Le
 * journal étant append-only et les fichiers vérifiés par hash, une
 * suppression physique ne se propagerait jamais vers l'autre téléphone : on
 * ajoute donc un contre-mouvement (type inverse, même montant) portant
 * correctionDe = id de la dette annulée. La dette d'origine reste dans le
 * journal mais est neutralisée par sa correction (voir listerIdsCorrections).
 * Une dette déjà annulée ne peut pas être annulée deux fois. Si la dette était
 * liée à un client du jour (dette auto de clôture) encore "non_paye", le
 * client revient à "en_attente" (montant/mode/encaisseAt vidés) : annuler la
 * dette revient à annuler la clôture. La clôture suivante recréera la dette
 * si le client n'a toujours pas payé.
 */
export async function supprimerDette(id: string): Promise<void> {
  const db = await openDatabase();

  const dette = await db.getFirstAsync<{
    clientNom: string;
    type: 'dette_plus' | 'dette_moins';
    montant: number;
    clientJourId: string | null;
  }>('SELECT clientNom, type, montant, clientJourId FROM dettes WHERE id = ?', id);
  if (!dette) {
    return;
  }

  const correctionExistante = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM dettes WHERE correctionDe = ?',
    id,
  );
  if (correctionExistante) {
    throw new Error('Cette dette a déjà été annulée.');
  }

  await ajouterDette({
    clientNom: dette.clientNom,
    type: dette.type === 'dette_plus' ? 'dette_moins' : 'dette_plus',
    montant: dette.montant,
    motif: 'Dette annulée (correction)',
    origine: 'manuel',
    correctionDe: id,
    clientJourId: null,
  });

  if (dette.clientJourId) {
    await db.runAsync(
      "UPDATE clients_jour SET statut = 'en_attente', modePaiement = NULL, montant = NULL, encaisseAt = NULL WHERE id = ? AND statut = 'non_paye'",
      dette.clientJourId,
    );
  }
}
