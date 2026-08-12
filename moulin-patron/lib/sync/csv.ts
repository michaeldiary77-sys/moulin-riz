const SEPARATEUR = ';';

/**
 * Marque d'ordre UTF-8 : ajoutée en tête des fichiers exportés pour que
 * Excel ouvre les accents correctement. L'import la supprime.
 */
export const BOM = '\uFEFF';

/**
 * Convertit une liste de champs en une ligne CSV, en appliquant les règles
 * de quoting : un champ contenant le séparateur, un guillemet ou un retour
 * à la ligne est entouré de guillemets, et les guillemets internes sont
 * doublés. Les valeurs null/undefined deviennent des champs vides.
 */
export function champsEnLigne(champs: Array<string | number | null | undefined>): string {
  return champs
    .map((champ) => {
      if (champ === null || champ === undefined) {
        return '';
      }
      const texte = String(champ);
      if (
        texte.includes(SEPARATEUR) ||
        texte.includes('"') ||
        texte.includes('\n') ||
        texte.includes('\r')
      ) {
        return `"${texte.replace(/"/g, '""')}"`;
      }
      return texte;
    })
    .join(SEPARATEUR);
}

/**
 * Construit le corps CSV d'un fichier : une ligne d'en-tête puis les lignes
 * de données, séparées par des fins de ligne LF.
 */
export function construireCSV(
  enTete: string[],
  lignes: Array<Array<string | number | null | undefined>>,
): string {
  return [enTete, ...lignes].map(champsEnLigne).join('\n');
}

/**
 * Analyse un corps CSV (sans BOM) en une liste de lignes, chaque ligne
 * étant une liste de champs. Gère les champs entre guillemets (avec
 * guillemets doublés) et les retours à la ligne à l'intérieur d'un champ
 * entre guillemets.
 */
export function parserLignesCSV(texte: string): string[][] {
  const resultats: string[][] = [];
  let ligne: string[] = [];
  let champ = '';
  let entreGuillemets = false;

  function terminerChamp() {
    ligne.push(champ);
    champ = '';
  }
  function terminerLigne() {
    terminerChamp();
    resultats.push(ligne);
    ligne = [];
  }

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (entreGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') {
          champ += '"';
          i++;
        } else {
          entreGuillemets = false;
        }
      } else {
        champ += c;
      }
    } else if (c === '"') {
      entreGuillemets = true;
    } else if (c === SEPARATEUR) {
      terminerChamp();
    } else if (c === '\n') {
      terminerLigne();
    } else if (c !== '\r') {
      champ += c;
    }
  }

  if (champ !== '' || ligne.length > 0) {
    terminerLigne();
  }

  return resultats;
}
