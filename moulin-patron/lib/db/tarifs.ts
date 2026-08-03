import { openDatabase } from './database';

/**
 * Lit la ligne unique (id = 1) de la table "tarifs".
 * Retourne null si aucune ligne n'existe encore.
 */
export async function lireTarifs(): Promise<{ arParKg: number; arParKpk: number } | null> {
  const db = await openDatabase();
  return db.getFirstAsync<{ arParKg: number; arParKpk: number }>(
    'SELECT arParKg, arParKpk FROM tarifs WHERE id = 1',
  );
}

/**
 * Crée ou remplace la ligne unique (id = 1) des tarifs avec les valeurs
 * données, et updatedAt réglé à la date/heure actuelle (format ISO).
 */
export async function definirTarifs(arParKg: number, arParKpk: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO tarifs (id, arParKg, arParKpk, updatedAt) VALUES (1, ?, ?, ?)',
    arParKg,
    arParKpk,
    new Date().toISOString(),
  );
}
