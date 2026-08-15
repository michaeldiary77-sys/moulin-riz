import { openDatabase } from '@/lib/db/database';
import { computeHash } from './hash';
import { BOM, parserLignesCSV } from './csv';
import { dateDuJourLocal } from '@/lib/utils/date';
import { doitAppliquerClientEntrant } from './fusion';

const VERSIONS_ACCEPTEES = new Set([1, 2]);

const STATUTS_VALIDES = new Set(['en_attente', 'paye', 'non_paye']);

/** Tolérance au-delà de laquelle un horodatage "futur" est jugé anormal. */
const TOLERANCE_FUTUR_MS = 15 * 60 * 1000;

/** Index des colonnes horodatées (createdAt, encaisseAt, ...) selon le type de fichier. */
const COLONNES_HORODATEES: Record<'journee' | 'tarifs' | 'dettes', number[]> = {
  // Les index v2 supplémentaires sont simplement absents dans un fichier v1.
  journee: [10, 11, 14, 17],
  tarifs: [2],
  dettes: [9, 12],
};

export type ResultatImport = {
  inseres: number;
  ignores: number;
  supprimes: number;
  avertissements: string[];
};

function chaineOuNull(valeur: string | undefined): string | null {
  const t = valeur?.trim();
  return t === undefined || t === '' ? null : t;
}

function nombreOuNull(valeur: string | undefined): number | null {
  if (valeur === undefined || valeur.trim() === '') {
    return null;
  }
  const n = Number(valeur);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalise le contenu lu d'un fichier : suppression du BOM UTF-8 et
 * uniformisation des fins de ligne (CRLF et CR deviennent LF) pour que la
 * vérification du hash soit stable quel que soit l'outil qui a recopié le
 * fichier.
 */
function normaliserContenu(contenu: string): string {
  let texte = contenu;
  if (texte.startsWith(BOM)) {
    texte = texte.slice(BOM.length);
  }
  return texte.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Détecte une anomalie d'horloge dans le fichier : l'appareil émetteur a pu
 * avoir la date/heure mal réglée, ce qui classerait les données sous de
 * mauvaises dates. On compare l'horodatage d'export (ligne méta) et les
 * horodatages des lignes (createdAt, encaisseAt, ...) à l'heure actuelle,
 * ainsi que la date de la journée pour un fichier de type journee. Une seule
 * alerte claire est retournée, mentionnant la date la plus éloignée dans le
 * futur. Il s'agit d'un simple avertissement : les données restent valables.
 */
function detecterAnomaliesHorloge(
  meta: Map<string, string>,
  lignes: string[][],
  type: 'journee' | 'tarifs' | 'dettes',
): string[] {
  const maintenant = Date.now();
  let pireFutur: string | null = null;

  const signaler = (iso: string): void => {
    const t = Date.parse(iso);
    if (Number.isFinite(t) && t > maintenant + TOLERANCE_FUTUR_MS) {
      if (pireFutur === null || t > Date.parse(pireFutur)) {
        pireFutur = iso;
      }
    }
  };

  const exportedAt = meta.get('exportedAt');
  if (exportedAt) {
    signaler(exportedAt);
  }

  if (type === 'journee') {
    const aujourdhui = dateDuJourLocal();
    for (const ligne of lignes) {
      const jour = (ligne[0] ?? '').trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(jour) && jour > aujourdhui) {
        signaler(`${jour}T12:00:00.000Z`);
        break;
      }
    }
  }

  for (const ligne of lignes) {
    for (const index of COLONNES_HORODATEES[type]) {
      const valeur = (ligne[index] ?? '').trim();
      if (valeur) {
        signaler(valeur);
      }
    }
  }

  if (pireFutur === null) {
    return [];
  }

  const dateLisible = new Date(Date.parse(pireFutur)).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return [
    `L'horloge de l'appareil qui a produit ce fichier semble mal réglée : des dates sont dans le futur (jusqu'au ${dateLisible}). Les données risquent d'être classées sous de mauvaises dates.`,
  ];
}

/**
 * Vérifie un fichier exporté : présence de la ligne méta, version de format
 * prise en charge, type attendu, et signature SHA-256 exacte. Retourne les
 * lignes de données (l'en-tête et la ligne méta sont retirées) ainsi que les
 * éventuels avertissements d'anomalie d'horloge. Lève une erreur claire à la
 * moindre anomalie (aucune donnée partielle possible).
 */
async function validerContenu(
  contenu: string,
  typeAttendu: 'journee' | 'tarifs' | 'dettes',
): Promise<{ lignes: string[][]; avertissements: string[]; version: number }> {
  const texte = normaliserContenu(contenu);

  const premierSaut = texte.indexOf('\n');
  const dernierSaut = texte.lastIndexOf('\n');
  if (premierSaut === -1 || dernierSaut === -1 || premierSaut === dernierSaut) {
    throw new Error('Fichier invalide : contenu trop court.');
  }

  const ligneMeta = texte.slice(0, premierSaut);
  const ligneHash = texte.slice(dernierSaut + 1);
  const corps = texte.slice(premierSaut + 1, dernierSaut);

  if (!ligneMeta.startsWith('#format=')) {
    throw new Error('Fichier invalide : en-tête de format manquant.');
  }
  const champsMeta = new Map(
    ligneMeta
      .slice(1)
      .split(';')
      .map((partie) => {
        const index = partie.indexOf('=');
        return [partie.slice(0, index), partie.slice(index + 1)];
      }),
  );
  const version = Number(champsMeta.get('format'));
  if (!VERSIONS_ACCEPTEES.has(version)) {
    throw new Error('Version de format non prise en charge.');
  }
  if (champsMeta.get('type') !== typeAttendu) {
    throw new Error(`Type de fichier inattendu (attendu : ${typeAttendu}).`);
  }

  if (!ligneHash.startsWith('#hash=')) {
    throw new Error('Fichier invalide : signature de contrôle manquante.');
  }
  const hashAttendu = ligneHash.slice('#hash='.length);
  const hashCalcule = await computeHash(`${ligneMeta}\n${corps}`);
  if (hashCalcule !== hashAttendu) {
    throw new Error('Fichier corrompu ou modifié (signature invalide).');
  }

  const lignes = parserLignesCSV(corps).filter(
    (ligne) => !(ligne.length === 1 && ligne[0].trim() === ''),
  );
  if (lignes.length < 1) {
    throw new Error('Fichier invalide : aucune donnée à importer.');
  }

  const avertissements = detecterAnomaliesHorloge(champsMeta, lignes, typeAttendu);

  return { lignes: lignes.slice(1), avertissements, version };
}

/**
 * Importe une journée. Chaque ligne est insérée si l'id est inconnu ; si
 * l'id existe déjà et que les données ont changé, la ligne est corrigée
 * (l'opérateur a modifié ou encaissé le client) sans jamais faire régresser
 * un statut plus avancé (ex. "paye" local ne repasse pas à "non_paye"). Les
 * clients locaux du jour encore "en_attente" et absents du fichier sont
 * retirés (l'opérateur les a supprimés de sa journée). Toute l'opération est
 * transactionnelle : une donnée invalide annule tout.
 */
export async function importerJournee(contenu: string): Promise<ResultatImport> {
  const { lignes, avertissements, version } = await validerContenu(contenu, 'journee');
  const db = await openDatabase();
  const tarifsLocaux = await db.getFirstAsync<{ arParKg: number; arParKpk: number }>(
    'SELECT arParKg, arParKpk FROM tarifs WHERE id = 1',
  );
  const tarifKgRepli = tarifsLocaux?.arParKg ?? 100;
  const tarifKpkRepli = tarifsLocaux?.arParKpk ?? 500;

  let inseres = 0;
  let ignores = 0;

  await db.withExclusiveTransactionAsync(async () => {
    for (const c of lignes) {
      const [
        date, nom, kg, modePaiement, montant, statut, profilNom, id, seq, deviceId,
        createdAt, encaisseAt, tarifArParKg, tarifArParKpk, updatedAt,
        updatedByDeviceId, supprime, supprimeAt,
      ] = c;
      const idN = chaineOuNull(id);
      const nomN = chaineOuNull(nom);
      const dateN = chaineOuNull(date);
      const kgN = nombreOuNull(kg);
      const statutN = chaineOuNull(statut) ?? 'en_attente';
      const seqN = nombreOuNull(seq);
      const deviceIdN = chaineOuNull(deviceId);
      const createdAtN = chaineOuNull(createdAt);

      if (
        !idN || !nomN || !dateN || kgN === null || kgN <= 0 || !STATUTS_VALIDES.has(statutN) ||
        seqN === null || !deviceIdN || !createdAtN
      ) {
        throw new Error(`Donnée invalide dans la journée (client « ${nomN ?? 'inconnu'} »).`);
      }

      const modePaiementN = chaineOuNull(modePaiement);
      const montantN = nombreOuNull(montant);
      const profilNomN = chaineOuNull(profilNom);
      const encaisseAtN = chaineOuNull(encaisseAt);
      const tarifKgN = version >= 2 ? nombreOuNull(tarifArParKg) : tarifKgRepli;
      const tarifKpkN = version >= 2 ? nombreOuNull(tarifArParKpk) : tarifKpkRepli;
      if (tarifKgN === null || tarifKgN <= 0 || tarifKpkN === null || tarifKpkN <= 0) {
        throw new Error(`Tarif historique invalide pour « ${nomN} ».`);
      }
      const updatedAtN =
        (version >= 2 ? chaineOuNull(updatedAt) : null) ?? encaisseAtN ?? createdAtN;
      const updatedByN =
        (version >= 2 ? chaineOuNull(updatedByDeviceId) : null) ?? deviceIdN;
      const supprimeN = version >= 2 && Number(supprime) === 1 ? 1 : 0;
      const supprimeAtN = version >= 2 ? chaineOuNull(supprimeAt) : null;

      const existant = await db.getFirstAsync<{
        statut: string;
        updatedAt: string | null;
        updatedByDeviceId: string | null;
      }>('SELECT statut, updatedAt, updatedByDeviceId FROM clients_jour WHERE id = ?', idN);

      if (!existant) {
        await db.runAsync(
          `INSERT INTO clients_jour
             (id, date, nom, kg, modePaiement, montant, statut, profilNom, seq, deviceId,
              createdAt, encaisseAt, tarifArParKg, tarifArParKpk, updatedAt,
              updatedByDeviceId, supprime, supprimeAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          idN, dateN, nomN, kgN, modePaiementN, montantN, statutN, profilNomN, seqN,
          deviceIdN, createdAtN, encaisseAtN, tarifKgN, tarifKpkN, updatedAtN,
          updatedByN, supprimeN, supprimeAtN,
        );
        inseres++;
        continue;
      }

      // Règle métier : le statut le plus final gagne. À statut égal, la
      // modification (updatedAt + deviceId comme départage déterministe) la plus récente gagne.
      if (!doitAppliquerClientEntrant(existant, {
        statut: statutN,
        updatedAt: updatedAtN,
        updatedByDeviceId: updatedByN,
      })) {
        ignores++;
        continue;
      }

      await db.runAsync(
        `UPDATE clients_jour SET
           nom = ?, kg = ?, modePaiement = ?, montant = ?, statut = ?, profilNom = ?,
           encaisseAt = ?, tarifArParKg = ?, tarifArParKpk = ?, updatedAt = ?,
           updatedByDeviceId = ?, supprime = ?, supprimeAt = ?
         WHERE id = ?`,
        nomN, kgN, modePaiementN, montantN, statutN, profilNomN, encaisseAtN,
        tarifKgN, tarifKpkN, updatedAtN, updatedByN, supprimeN, supprimeAtN, idN,
      );
      inseres++;
    }
  });

  // Une absence dans un fichier n'est jamais interprétée comme une suppression.
  return { inseres, ignores, supprimes: 0, avertissements };
}

/**
 * Importe les tarifs : remplace la ligne unique (id = 1) de tarifs. Une
 * seule ligne attendue ; valeurs absentes ou nulles => refus.
 */
export async function importerTarifs(contenu: string): Promise<ResultatImport> {
  const { lignes, avertissements } = await validerContenu(contenu, 'tarifs');
  if (lignes.length !== 1) {
    throw new Error('Fichier de tarifs invalide : une seule ligne attendue.');
  }

  const [arParKg, arParKpk, updatedAt] = lignes[0];
  const kg = nombreOuNull(arParKg);
  const kpk = nombreOuNull(arParKpk);
  if (kg === null || kpk === null || kg <= 0 || kpk <= 0) {
    throw new Error('Fichier de tarifs invalide : valeurs manquantes ou nulles.');
  }

  const db = await openDatabase();
  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync(
      'INSERT OR REPLACE INTO tarifs (id, arParKg, arParKpk, updatedAt) VALUES (1, ?, ?, ?)',
      kg,
      kpk,
      chaineOuNull(updatedAt) ?? new Date().toISOString(),
    );
  });

  return { inseres: 1, ignores: 0, supprimes: 0, avertissements };
}

/**
 * Importe le journal des dettes : insère chaque mouvement dans dettes.
 * Insertion idempotente (INSERT OR IGNORE sur la clé primaire) : un id déjà
 * connu est ignoré. Le journal étant append-only, aucune ligne existante
 * n'est jamais modifiée ni supprimée (les corrections arrivent comme de
 * nouveaux contre-mouvements portant correctionDe) — à l'exception du
 * remboursement : côté opérateur, il modifie en place remboursee/rembourseeAt,
 * donc une ligne déjà connue marquée "remboursee = 1" est mise à jour (sans
 * jamais faire régresser un remboursement local). Le client du jour lié passe
 * alors au statut "paye". Import transactionnel : une donnée invalide annule
 * tout.
 */
export async function importerDettes(contenu: string): Promise<ResultatImport> {
  const { lignes, avertissements } = await validerContenu(contenu, 'dettes');
  const db = await openDatabase();

  let inseres = 0;
  let ignores = 0;

  await db.withExclusiveTransactionAsync(async () => {
    for (const d of lignes) {
      const [id, clientNom, type, montant, motif, origine, correctionDe, clientJourId, remboursee, rembourseeAt, seq, deviceId, createdAt] =
        d;

      const idN = chaineOuNull(id);
      const clientNomN = chaineOuNull(clientNom);
      const typeN = chaineOuNull(type);
      const montantN = nombreOuNull(montant);

      if (
        !idN ||
        !clientNomN ||
        (typeN !== 'dette_plus' && typeN !== 'dette_moins') ||
        montantN === null
      ) {
        throw new Error(`Donnée invalide dans les dettes (mouvement « ${idN ?? 'inconnu'} »).`);
      }

      const rembourseeN = Number(remboursee) === 1 ? 1 : 0;
      const rembourseeAtN = chaineOuNull(rembourseeAt);
      const clientJourIdN = chaineOuNull(clientJourId);
      const correctionDeN = chaineOuNull(correctionDe);
      const deviceIdN = chaineOuNull(deviceId);
      const createdAtN = chaineOuNull(createdAt);

      const resultat = await db.runAsync(
        `INSERT OR IGNORE INTO dettes
           (id, clientNom, type, montant, motif, origine, correctionDe, clientJourId, remboursee, rembourseeAt, seq, deviceId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        idN,
        clientNomN,
        typeN,
        montantN,
        chaineOuNull(motif),
        chaineOuNull(origine) ?? 'manuel',
        correctionDeN,
        clientJourIdN,
        rembourseeN,
        rembourseeAtN,
        nombreOuNull(seq),
        deviceIdN,
        createdAtN,
      );
      if (resultat.changes === 1) {
        inseres++;
        if (rembourseeN === 1 && clientJourIdN) {
          await db.runAsync(
            `UPDATE clients_jour SET statut = 'paye', updatedAt = ?, updatedByDeviceId = ?
              WHERE id = ? AND statut = 'non_paye'`,
            rembourseeAtN ?? createdAtN ?? new Date().toISOString(),
            deviceIdN,
            clientJourIdN,
          );
        }
        if (correctionDeN) {
          const origineCorrigee = await db.getFirstAsync<{ clientJourId: string | null }>(
            'SELECT clientJourId FROM dettes WHERE id = ?',
            correctionDeN,
          );
          if (origineCorrigee?.clientJourId) {
            await db.runAsync(
              `UPDATE clients_jour SET statut = 'en_attente', modePaiement = NULL, montant = NULL,
                encaisseAt = NULL, updatedAt = ?, updatedByDeviceId = ?
                WHERE id = ? AND statut = 'non_paye'`,
              createdAtN ?? new Date().toISOString(),
              deviceIdN,
              origineCorrigee.clientJourId,
            );
          }
        }
        continue;
      }

      // Ligne déjà connue : le journal des dettes est append-only, seul un
      // remboursement (modification en place côté opérateur) peut arriver sur
      // une ligne existante. On le propage sans jamais faire régresser un
      // remboursement déjà enregistré localement.
      if (rembourseeN === 1) {
        const maj = await db.runAsync(
          'UPDATE dettes SET remboursee = 1, rembourseeAt = ? WHERE id = ? AND remboursee = 0',
          rembourseeAtN ?? new Date().toISOString(),
          idN,
        );
        if (maj.changes === 1) {
          inseres++;
          if (clientJourIdN) {
            await db.runAsync(
              `UPDATE clients_jour SET statut = 'paye', updatedAt = ?, updatedByDeviceId = ?
                WHERE id = ? AND statut = 'non_paye'`,
              rembourseeAtN ?? createdAtN ?? new Date().toISOString(),
              deviceIdN,
              clientJourIdN,
            );
          }
        } else {
          ignores++;
        }
      } else {
        ignores++;
      }
    }
  });

  return { inseres, ignores, supprimes: 0, avertissements };
}
