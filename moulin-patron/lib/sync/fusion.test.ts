import { describe, expect, it } from 'vitest';

import { doitAppliquerClientEntrant } from './fusion';

const version = (statut: string, updatedAt: string, device = 'appareil-a') => ({
  statut,
  updatedAt,
  updatedByDeviceId: device,
});

describe('fusion des clients', () => {
  it('ne fait jamais régresser un paiement final', () => {
    expect(
      doitAppliquerClientEntrant(
        version('paye', '2026-08-15T12:00:00.000Z'),
        version('en_attente', '2026-08-15T13:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('accepte un statut plus final même si son horodatage est plus ancien', () => {
    expect(
      doitAppliquerClientEntrant(
        version('en_attente', '2026-08-15T13:00:00.000Z'),
        version('paye', '2026-08-15T12:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('prend la modification la plus récente à statut égal', () => {
    expect(
      doitAppliquerClientEntrant(
        version('en_attente', '2026-08-15T12:00:00.000Z'),
        version('en_attente', '2026-08-15T13:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('ignore un réimport identique', () => {
    const identique = version('non_paye', '2026-08-15T12:00:00.000Z');
    expect(doitAppliquerClientEntrant(identique, identique)).toBe(false);
  });

  it('départage deux dates égales avec le deviceId', () => {
    expect(
      doitAppliquerClientEntrant(
        version('en_attente', '2026-08-15T12:00:00.000Z', 'appareil-a'),
        version('en_attente', '2026-08-15T12:00:00.000Z', 'appareil-b'),
      ),
    ).toBe(true);
  });
});
