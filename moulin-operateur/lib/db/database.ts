import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

const DATABASE_NAME = 'moulin_v2.db';

let db: SQLiteDatabase | null = null;

export async function openDatabase(): Promise<SQLiteDatabase> {
  if (!db) {
    db = await openDatabaseAsync(DATABASE_NAME);
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = await openDatabase();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS profils (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL
    );

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
      encaisseAt TEXT,
      tarifArParKg REAL,
      tarifArParKpk REAL,
      updatedAt TEXT,
      updatedByDeviceId TEXT,
      supprime INTEGER NOT NULL DEFAULT 0,
      supprimeAt TEXT
    );

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

    CREATE TABLE IF NOT EXISTS tarifs (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      arParKg REAL NOT NULL,
      arParKpk REAL NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      deviceId TEXT PRIMARY KEY,
      nextSeq INTEGER NOT NULL
    );
  `);

  await migrer(database);
}

async function ajouterColonneSiAbsente(
  database: SQLiteDatabase,
  table: string,
  colonnes: Set<string>,
  nom: string,
  definition: string,
): Promise<void> {
  if (!colonnes.has(nom)) {
    await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${nom} ${definition}`);
  }
}

async function migrer(database: SQLiteDatabase): Promise<void> {
  const colonnesDettes = new Set(
    (await database.getAllAsync<{ name: string }>('PRAGMA table_info(dettes)')).map((c) => c.name),
  );
  await ajouterColonneSiAbsente(database, 'dettes', colonnesDettes, 'clientJourId', 'TEXT');
  await ajouterColonneSiAbsente(
    database,
    'dettes',
    colonnesDettes,
    'remboursee',
    'INTEGER NOT NULL DEFAULT 0',
  );
  await ajouterColonneSiAbsente(database, 'dettes', colonnesDettes, 'rembourseeAt', 'TEXT');

  const colonnesClients = new Set(
    (await database.getAllAsync<{ name: string }>('PRAGMA table_info(clients_jour)')).map(
      (c) => c.name,
    ),
  );
  await ajouterColonneSiAbsente(database, 'clients_jour', colonnesClients, 'tarifArParKg', 'REAL');
  await ajouterColonneSiAbsente(database, 'clients_jour', colonnesClients, 'tarifArParKpk', 'REAL');
  await ajouterColonneSiAbsente(database, 'clients_jour', colonnesClients, 'updatedAt', 'TEXT');
  await ajouterColonneSiAbsente(
    database,
    'clients_jour',
    colonnesClients,
    'updatedByDeviceId',
    'TEXT',
  );
  await ajouterColonneSiAbsente(
    database,
    'clients_jour',
    colonnesClients,
    'supprime',
    'INTEGER NOT NULL DEFAULT 0',
  );
  await ajouterColonneSiAbsente(database, 'clients_jour', colonnesClients, 'supprimeAt', 'TEXT');

  // Les anciennes lignes reçoivent le tarif local actuel, ou les valeurs métier par défaut.
  const tarifs = await database.getFirstAsync<{ arParKg: number; arParKpk: number }>(
    'SELECT arParKg, arParKpk FROM tarifs WHERE id = 1',
  );
  await database.runAsync(
    `UPDATE clients_jour
       SET tarifArParKg = COALESCE(tarifArParKg, ?),
           tarifArParKpk = COALESCE(tarifArParKpk, ?),
           updatedAt = COALESCE(updatedAt, encaisseAt, createdAt),
           updatedByDeviceId = COALESCE(updatedByDeviceId, deviceId),
           supprime = COALESCE(supprime, 0)`,
    tarifs?.arParKg ?? 100,
    tarifs?.arParKpk ?? 500,
  );
}
