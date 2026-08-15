import { describe, expect, it } from 'vitest';

import { construireCSV, parserLignesCSV } from './csv';

describe('CSV de synchronisation', () => {
  it('préserve les séparateurs, guillemets, accents et retours à la ligne', () => {
    const csv = construireCSV(['nom', 'motif'], [['Rasoa; Jean', 'Riz "spécial"\ndeux lignes']]);
    expect(parserLignesCSV(csv)).toEqual([
      ['nom', 'motif'],
      ['Rasoa; Jean', 'Riz "spécial"\ndeux lignes'],
    ]);
  });

  it('préserve les champs vides', () => {
    expect(parserLignesCSV(construireCSV(['a', 'b'], [['', null]]))).toEqual([
      ['a', 'b'],
      ['', ''],
    ]);
  });
});
