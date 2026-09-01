import { randomUUID } from 'expo-crypto';

import { openDatabase } from './database';

/**
 * Retourne l'identifiant unique de l'appareil (deviceId).
 * Le deviceId est généré une seule fois puis réutilisé : il identifie
 * l'origine de chaque enregistrement lors des échanges de fichiers.
 */
export async function obtenirDeviceId(): Promise<string> {
  const db = await openDatabase();
  const ligne = await db.getFirstAsync<{ deviceId: string }>('SELECT deviceId FROM app_meta LIMIT 1');
  if (ligne) {
    return ligne.deviceId;
  }
  const deviceId = randomUUID();
  await db.runAsync('INSERT OR IGNORE INTO app_meta (deviceId, nextSeq) VALUES (?, 1)', deviceId);
  const relue = await db.getFirstAsync<{ deviceId: string }>('SELECT deviceId FROM app_meta LIMIT 1');
  return relue?.deviceId ?? deviceId;
}

/**
 * Retourne la prochaine valeur de séquence et l'incrémente en base.
 * Le compteur seq permet d'ordonner les mouvements du journal (dettes,
 * clients...) indépendamment de l'horloge système : c'est lui qui donne
 * l'ordre fiable lors des échanges entre appareils.
 */
export async function obtenirProchaineSeq(): Promise<number> {
  const db = await openDatabase();
  const deviceId = await obtenirDeviceId();
  let seq = 1;
  await db.withExclusiveTransactionAsync(async () => {
    const ligne = await db.getFirstAsync<{ nextSeq: number }>(
      'SELECT nextSeq FROM app_meta WHERE deviceId = ?',
      deviceId,
    );
    seq = ligne?.nextSeq ?? 1;
    await db.runAsync('UPDATE app_meta SET nextSeq = ? WHERE deviceId = ?', seq + 1, deviceId);
  });
  return seq;
}
