import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

const DATABASE_NAME = 'moulin_v2.db';

let db: SQLiteDatabase | null = null;

/**
 * Ouvre la base SQLite "moulin_v2.db" (la crée si elle n'existe pas).
 */
export async function openDatabase(): Promise<SQLiteDatabase> {
  if (!db) {
    db = await openDatabaseAsync(DATABASE_NAME);
  }
  return db;
}

/**
 * Crée les tables de l'application si elles n'existent pas déjà.
 * À appeler une seule fois au démarrage de l'app.
 */
export async function initDatabase(): Promise<void> {
  const database = await openDatabase();
  await database.execAsync(`
    -- profils : identités des personnes qui utilisent le téléphone (sélecteur "Qui êtes-vous ?")
    CREATE TABLE IF NOT EXISTS profils (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL
    );

    -- clients_jour : opérations de moulage d'une journée (import/export via journee.csv)
    CREATE TABLE IF NOT EXISTS clients_jour (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      nom TEXT NOT NULL,
      kg REAL NOT NULL,
      modePaiement TEXT,
      montant REAL,
      statut TEXT NOT NULL CHECK (statut IN ('en_attente', 'paye', 'non_paye')),
      profilNom TEXT,
      seq INTEGER NOT NULL,
      deviceId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      encaisseAt TEXT
    );

    -- dettes : journal append-only des mouvements de dettes (import/export via dettes.csv)
    CREATE TABLE IF NOT EXISTS dettes (
      id TEXT PRIMARY KEY,
      clientNom TEXT NOT NULL,
      type TEXT NOT NULL,
      montant REAL NOT NULL,
      motif TEXT,
      origine TEXT NOT NULL,
      correctionDe TEXT,
      clientJourId TEXT,
      remboursee INTEGER NOT NULL DEFAULT 0,
      rembourseeAt TEXT,
      seq INTEGER NOT NULL,
      deviceId TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    -- tarifs : réglages des tarifs du moulin (une seule ligne, id = 1)
    CREATE TABLE IF NOT EXISTS tarifs (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      arParKg REAL NOT NULL,
      arParKpk REAL NOT NULL,
      updatedAt TEXT NOT NULL
    );

    -- app_meta : métadonnées de l'appareil (identifiant + compteur de séquence global)
    CREATE TABLE IF NOT EXISTS app_meta (
      deviceId TEXT PRIMARY KEY,
      nextSeq INTEGER NOT NULL
    );
  `);

  await migrer(database);
}

/**
 * Migration des bases existantes : les colonnes de remboursement des dettes
 * n'existaient pas à la création initiale de la table. On les ajoute via
 * ALTER TABLE si elles manquent (CREATE TABLE IF NOT EXISTS ne modifie pas
 * une table déjà existante).
 */
async function migrer(database: SQLiteDatabase): Promise<void> {
  const colonnesDettes = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(dettes)',
  );
  const noms = new Set(colonnesDettes.map((c) => c.name));

  if (!noms.has('clientJourId')) {
    await database.execAsync('ALTER TABLE dettes ADD COLUMN clientJourId TEXT');
  }
  if (!noms.has('remboursee')) {
    await database.execAsync(
      'ALTER TABLE dettes ADD COLUMN remboursee INTEGER NOT NULL DEFAULT 0',
    );
  }
  if (!noms.has('rembourseeAt')) {
    await database.execAsync('ALTER TABLE dettes ADD COLUMN rembourseeAt TEXT');
  }
}
