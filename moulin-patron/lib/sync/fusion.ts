export const RANG_STATUT_CLIENT: Record<string, number> = {
  en_attente: 0,
  non_paye: 1,
  paye: 2,
};

export type VersionClient = {
  statut: string;
  updatedAt: string | null;
  updatedByDeviceId: string | null;
};

/**
 * Un état métier final ne régresse jamais. À statut égal, updatedAt gagne ;
 * le deviceId départage deux modifications ayant exactement la même date.
 */
export function doitAppliquerClientEntrant(local: VersionClient, entrant: VersionClient): boolean {
  const rangEntrant = RANG_STATUT_CLIENT[entrant.statut] ?? 0;
  const rangLocal = RANG_STATUT_CLIENT[local.statut] ?? 0;
  if (rangEntrant !== rangLocal) return rangEntrant > rangLocal;

  const cleEntrante = `${entrant.updatedAt ?? ''}|${entrant.updatedByDeviceId ?? ''}`;
  const cleLocale = `${local.updatedAt ?? ''}|${local.updatedByDeviceId ?? ''}`;
  return cleEntrante > cleLocale;
}
