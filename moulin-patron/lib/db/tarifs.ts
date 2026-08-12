import { openDatabase } from './database';

/**
 * Lit la ligne unique (id = 1) de la table "tarifs".
 * Retourne null si aucune ligne n'existe encore.
 */
export async function lireTarifs(): Promise<{
  arParKg: number;
  arParKpk: number;
  updatedAt: string;
} | null> {
  const db = await openDatabase();
  return db.getFirstAsync<{ arParKg: number; arParKpk: number; updatedAt: string }>(
    'SELECT arParKg, arParKpk, updatedAt FROM tarifs WHERE id = 1',
  );
}

/**
 * Crée ou remplace la ligne unique (id = 1) des tarifs avec les valeurs
 * données, et updatedAt réglé à la date/heure actuelle (format ISO).
 */
export async function definirTarifs(arParKg: number, arParKpk: number): Promise<void> {
  if (
    !Number.isFinite(arParKg) ||
    arParKg <= 0 ||
    !Number.isFinite(arParKpk) ||
    arParKpk <= 0
  ) {
    throw new Error('Les tarifs doivent être des nombres strictement positifs.');
  }
  const db = await openDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO tarifs (id, arParKg, arParKpk, updatedAt) VALUES (1, ?, ?, ?)',
    arParKg,
    arParKpk,
    new Date().toISOString(),
  );
}
