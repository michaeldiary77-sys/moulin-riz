import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { obtenirDeviceId } from '@/lib/db/appMeta';
import { listerClientsDuJour } from '@/lib/db/clients';
import { listerDettes } from '@/lib/db/dettes';
import { lireTarifs } from '@/lib/db/tarifs';
import { computeHash } from './hash';
import { BOM, construireCSV } from './csv';

const FORMAT_VERSION = 1;

const EN_TETE_JOURNEE = [
  'date',
  'nom',
  'kg',
  'modePaiement',
  'montant',
  'statut',
  'profilNom',
  'id',
  'seq',
  'deviceId',
  'createdAt',
  'encaisseAt',
];

const EN_TETE_TARIFS = ['arParKg', 'arParKpk', 'updatedAt'];

const EN_TETE_DETTES = [
  'id',
  'clientNom',
  'type',
  'montant',
  'motif',
  'origine',
  'correctionDe',
  'clientJourId',
  'remboursee',
  'rembourseeAt',
  'seq',
  'deviceId',
  'createdAt',
];

export type FichierExport = {
  nomFichier: string;
  contenu: string;
};

/**
 * Construit le contenu d'un fichier exporté : ligne méta (format, type,
 * appareil émetteur, horodatage) + ligne d'en-tête + données, puis une
 * ligne finale #hash=<sha256> qui couvre tout le contenu précédent
 * (détection de corruption/modification, indépendante du nom du fichier).
 * Le fichier commence par un BOM UTF-8 pour une ouverture correcte dans
 * Excel.
 */
async function construireFichier(
  type: 'journee' | 'tarifs' | 'dettes',
  enTete: string[],
  lignes: Array<Array<string | number | null | undefined>>,
  nomFichier: string,
): Promise<FichierExport> {
  const deviceId = await obtenirDeviceId();
  const meta = `#format=${FORMAT_VERSION};type=${type};deviceId=${deviceId};exportedAt=${new Date().toISOString()}`;
  const corps = construireCSV(enTete, lignes);
  const partie = [meta, corps].join('\n');
  const hash = await computeHash(partie);
  return { nomFichier, contenu: BOM + partie + '\n#hash=' + hash };
}

/**
 * Exporte la journée donnée (une ligne par client) dans journee_AAAA-MM-JJ.csv.
 */
export async function exporterJournee(date: string): Promise<FichierExport> {
  const clients = await listerClientsDuJour(date);
  const lignes = clients.map((c) => [
    c.date,
    c.nom,
    c.kg,
    c.modePaiement,
    c.montant,
    c.statut,
    c.profilNom,
    c.id,
    c.seq,
    c.deviceId,
    c.createdAt,
    c.encaisseAt,
  ]);
  return construireFichier('journee', EN_TETE_JOURNEE, lignes, `journee_${date}.csv`);
}

/**
 * Exporte les tarifs actuels dans tarifs.csv (une seule ligne).
 */
export async function exporterTarifs(): Promise<FichierExport> {
  const tarifs = await lireTarifs();
  if (!tarifs) {
    throw new Error('Aucun tarif enregistré à exporter.');
  }
  return construireFichier(
    'tarifs',
    EN_TETE_TARIFS,
    [[tarifs.arParKg, tarifs.arParKpk, tarifs.updatedAt]],
    'tarifs.csv',
  );
}

/**
 * Exporte le journal complet des dettes dans dettes.csv (append-only :
 * chaque export contient tout l'historique, l'import ignore les lignes déjà
 * connues).
 */
export async function exporterDettes(): Promise<FichierExport> {
  const dettes = await listerDettes();
  const lignes = dettes.map((d) => [
    d.id,
    d.clientNom,
    d.type,
    d.montant,
    d.motif,
    d.origine,
    d.correctionDe,
    d.clientJourId,
    d.remboursee,
    d.rembourseeAt,
    d.seq,
    d.deviceId,
    d.createdAt,
  ]);
  return construireFichier('dettes', EN_TETE_DETTES, lignes, 'dettes.csv');
}

/**
 * Écrit le fichier dans le cache puis ouvre la feuille de partage native
 * (Android/iOS). Lève une erreur si le partage n'est pas disponible.
 */
export async function partagerFichier(fichier: FichierExport): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
  }
  const fichierSysteme = new File(Paths.cache, fichier.nomFichier);
  fichierSysteme.create({ overwrite: true, intermediates: true });
  fichierSysteme.write(fichier.contenu);
  await Sharing.shareAsync(fichierSysteme.uri, {
    mimeType: 'text/csv',
    dialogTitle: `Partager ${fichier.nomFichier}`,
    UTI: 'public.comma-separated-values-text',
  });
}
