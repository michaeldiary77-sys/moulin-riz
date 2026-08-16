import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * moulin-operateur et moulin-patron sont deux applications indépendantes qui
 * doivent néanmoins s'accorder exactement sur le protocole d'échange CSV
 * (format des fichiers, règles de fusion, calcul du hash) : ces fichiers
 * sont dupliqués entre les deux dépôts plutôt que partagés. Ce test échoue
 * si l'un des deux a été modifié sans reporter le même changement dans
 * l'autre, pour éviter qu'une divergence silencieuse ne fausse une fusion
 * de données réelle (montants, dettes, statuts clients).
 */
const FICHIERS_PARTAGES = ['fusion.ts', 'csv.ts', 'hash.ts', 'import.ts', 'export.ts'];

const iciDir = dirname(fileURLToPath(import.meta.url));
const autreAppDir = join(iciDir, '..', '..', '..', 'moulin-patron', 'lib', 'sync');

describe.skipIf(!existsSync(autreAppDir))(
  "parité du protocole d'échange avec moulin-patron",
  () => {
    it.each(FICHIERS_PARTAGES)('%s doit être identique dans les deux applications', (nomFichier) => {
      const ici = readFileSync(join(iciDir, nomFichier), 'utf-8');
      const autre = readFileSync(join(autreAppDir, nomFichier), 'utf-8');
      expect(
        autre,
        `${nomFichier} a divergé entre moulin-operateur et moulin-patron : le format ` +
          "d'échange CSV ou les règles de fusion ne sont plus garantis identiques. " +
          "Reportez le changement dans l'autre application (ou annulez-le) avant de continuer.",
      ).toBe(ici);
    });
  },
);
