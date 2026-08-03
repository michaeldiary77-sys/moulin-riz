import { openDatabase } from './database';

export type Profil = {
  id: number;
  nom: string;
};

/**
 * Retourne la liste de tous les profils enregistrés, triés par nom.
 */
export async function listerProfils(): Promise<Profil[]> {
  const db = await openDatabase();
  return db.getAllAsync<Profil>('SELECT id, nom FROM profils ORDER BY nom');
}

/**
 * Insère un nouveau profil avec le nom donné et retourne son id généré.
 */
export async function ajouterProfil(nom: string): Promise<number> {
  const db = await openDatabase();
  const result = await db.runAsync('INSERT INTO profils (nom) VALUES (?)', nom);
  return result.lastInsertRowId;
}
