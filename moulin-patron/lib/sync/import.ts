import { openDatabase } from '@/lib/db/database';
import { computeHash } from './hash';
import { BOM, parserLignesCSV } from './csv';
import { dateDuJourLocal } from '@/lib/utils/date';

const FORMAT_VERSION = 1;

const STATUTS_VALIDES = new Set(['en_attente', 'paye', 'non_paye']);

/** Tolérance au-delà de laquelle un horodatage "futur" est jugé anormal. */
const TOLERANCE_FUTUR_MS = 15 * 60 * 1000;

/** Rang de finalité d'un statut : on ne régresse jamais vers un statut moins avancé. */
const RANG_STATUT: Record<string, number> = { en_attente: 0, non_paye: 1, paye: 2 };

/** Index des colonnes horodatées (createdAt, encaisseAt, ...) selon le type de fichier. */
const COLONNES_HORODATEES: Record<'journee' | 'tarifs' | 'dettes', number[]> = {
  journee: [10, 11],
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
): Promise<{ lignes: string[][]; avertissements: string[] }> {
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
  if (Number(champsMeta.get('format')) !== FORMAT_VERSION) {
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

  return { lignes: lignes.slice(1), avertissements };
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
  const { lignes, avertissements } = await validerContenu(contenu, 'journee');
  const db = await openDatabase();

  let inseres = 0;
  let ignores = 0;
  let supprimes = 0;

  const idsDuFichier = new Set<string>();
  const datesDuFichier = new Set<string>();

  await db.withExclusiveTransactionAsync(async () => {
    for (const c of lignes) {
      const [date, nom, kg, modePaiement, montant, statut, profilNom, id, seq, deviceId, createdAt, encaisseAt] =
        c;

      const idN = chaineOuNull(id);
      const nomN = chaineOuNull(nom);
      const dateN = chaineOuNull(date);
      const kgN = nombreOuNull(kg);
      const statutN = chaineOuNull(statut) ?? 'en_attente';

      if (!idN || !nomN || !dateN || kgN === null || !STATUTS_VALIDES.has(statutN)) {
        throw new Error(`Donnée invalide dans la journée (client « ${nomN ?? 'inconnu'} »).`);
      }

      const modePaiementN = chaineOuNull(modePaiement);
      const montantN = nombreOuNull(montant);
      const profilNomN = chaineOuNull(profilNom);
      const encaisseAtN = chaineOuNull(encaisseAt);

      idsDuFichier.add(idN);
      datesDuFichier.add(dateN);

      const existant = await db.getFirstAsync<{
        statut: string;
        nom: string;
        kg: number;
        modePaiement: string | null;
        montant: number | null;
        profilNom: string | null;
        encaisseAt: string | null;
      }>(
        'SELECT statut, nom, kg, modePaiement, montant, profilNom, encaisseAt FROM clients_jour WHERE id = ?',
        idN,
      );

      if (!existant) {
        await db.runAsync(
          `INSERT INTO clients_jour
             (id, date, nom, kg, modePaiement, montant, statut, profilNom, seq, deviceId, createdAt, encaisseAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          idN,
          dateN,
          nomN,
          kgN,
          modePaiementN,
          montantN,
          statutN,
          profilNomN,
          nombreOuNull(seq),
          chaineOuNull(deviceId),
          chaineOuNull(createdAt),
          encaisseAtN,
        );
        inseres++;
        continue;
      }

      const identiques =
        existant.nom === nomN &&
        existant.kg === kgN &&
        existant.modePaiement === modePaiementN &&
        existant.montant === montantN &&
        existant.statut === statutN &&
        existant.profilNom === profilNomN &&
        existant.encaisseAt === encaisseAtN;

      if (identiques) {
        ignores++;
        continue;
      }

      const statutFinal =
        (RANG_STATUT[statutN] ?? 0) < (RANG_STATUT[existant.statut] ?? 0)
          ? existant.statut
          : statutN;

      await db.runAsync(
        `UPDATE clients_jour
           SET nom = ?, kg = ?, modePaiement = ?, montant = ?, statut = ?, profilNom = ?, encaisseAt = ?
         WHERE id = ?`,
        nomN,
        kgN,
        modePaiementN,
        montantN,
        statutFinal,
        profilNomN,
        encaisseAtN,
        idN,
      );
      inseres++;
    }

    if (datesDuFichier.size > 0) {
      const placeholders = [...datesDuFichier].map(() => '?').join(',');
      const locaux = await db.getAllAsync<{ id: string }>(
        `SELECT id FROM clients_jour WHERE statut = 'en_attente' AND date IN (${placeholders})`,
        ...[...datesDuFichier],
      );
      for (const local of locaux) {
        if (!idsDuFichier.has(local.id)) {
          await db.runAsync('DELETE FROM clients_jour WHERE id = ?', local.id);
          supprimes++;
        }
      }
    }
  });

  return { inseres, ignores, supprimes, avertissements };
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
        chaineOuNull(correctionDe),
        clientJourIdN,
        rembourseeN,
        rembourseeAtN,
        nombreOuNull(seq),
        chaineOuNull(deviceId),
        chaineOuNull(createdAt),
      );
      if (resultat.changes === 1) {
        inseres++;
        if (rembourseeN === 1 && clientJourIdN) {
          await db.runAsync(
            "UPDATE clients_jour SET statut = 'paye' WHERE id = ? AND statut = 'non_paye'",
            clientJourIdN,
          );
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
              "UPDATE clients_jour SET statut = 'paye' WHERE id = ? AND statut = 'non_paye'",
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
