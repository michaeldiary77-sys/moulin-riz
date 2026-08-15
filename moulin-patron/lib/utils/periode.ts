export type Granularite = 'jour' | 'semaine' | 'mois' | 'annee' | 'intervalle';

export type Intervalle = { debut: string; fin: string };

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function dateVersCle(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function cleVersDate(cle: string): Date {
  const [annee, mois, jour] = cle.split('-').map(Number);
  return new Date(annee, mois - 1, jour);
}

export function ajouterJours(cle: string, jours: number): string {
  const d = cleVersDate(cle);
  d.setDate(d.getDate() + jours);
  return dateVersCle(d);
}

/** Semaine lundi → dimanche contenant la date. */
export function bornesSemaine(cle: string): Intervalle {
  const d = cleVersDate(cle);
  const jour = d.getDay(); // 0 dimanche
  const decalageLundi = jour === 0 ? -6 : 1 - jour;
  const lundi = new Date(d);
  lundi.setDate(d.getDate() + decalageLundi);
  const dimanche = new Date(lundi);
  dimanche.setDate(lundi.getDate() + 6);
  return { debut: dateVersCle(lundi), fin: dateVersCle(dimanche) };
}

export function bornesMois(cle: string): Intervalle {
  const d = cleVersDate(cle);
  const debut = new Date(d.getFullYear(), d.getMonth(), 1);
  const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { debut: dateVersCle(debut), fin: dateVersCle(fin) };
}

export function bornesAnnee(cle: string): Intervalle {
  const d = cleVersDate(cle);
  return {
    debut: `${d.getFullYear()}-01-01`,
    fin: `${d.getFullYear()}-12-31`,
  };
}

export function calculerBornes(
  granularite: Granularite,
  pivot: string,
  intervalle: Intervalle,
): Intervalle {
  if (granularite === 'jour') {
    return { debut: pivot, fin: pivot };
  }
  if (granularite === 'semaine') {
    return bornesSemaine(pivot);
  }
  if (granularite === 'mois') {
    return bornesMois(pivot);
  }
  if (granularite === 'annee') {
    return bornesAnnee(pivot);
  }
  return intervalle.debut <= intervalle.fin
    ? intervalle
    : { debut: intervalle.fin, fin: intervalle.debut };
}

export function decalerPeriode(
  granularite: Granularite,
  pivot: string,
  intervalle: Intervalle,
  sens: -1 | 1,
): { pivot: string; intervalle: Intervalle } {
  if (granularite === 'jour') {
    return { pivot: ajouterJours(pivot, sens), intervalle };
  }
  if (granularite === 'semaine') {
    return { pivot: ajouterJours(pivot, sens * 7), intervalle };
  }
  if (granularite === 'mois') {
    const d = cleVersDate(pivot);
    d.setMonth(d.getMonth() + sens);
    return { pivot: dateVersCle(d), intervalle };
  }
  if (granularite === 'annee') {
    const d = cleVersDate(pivot);
    d.setFullYear(d.getFullYear() + sens);
    return { pivot: dateVersCle(d), intervalle };
  }
  const debut = cleVersDate(intervalle.debut);
  const fin = cleVersDate(intervalle.fin);
  const duree = Math.round((fin.getTime() - debut.getTime()) / 86400000) + 1;
  return {
    pivot,
    intervalle: {
      debut: ajouterJours(intervalle.debut, sens * duree),
      fin: ajouterJours(intervalle.fin, sens * duree),
    },
  };
}

export function libellePeriode(granularite: Granularite, bornes: Intervalle): string {
  const debutDate = cleVersDate(bornes.debut);
  if (granularite === 'jour') {
    return debutDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  if (granularite === 'mois') {
    return debutDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  if (granularite === 'annee') {
    return String(debutDate.getFullYear());
  }
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${cleVersDate(bornes.debut).toLocaleDateString('fr-FR', opts)} → ${cleVersDate(bornes.fin).toLocaleDateString('fr-FR', opts)}`;
}

export function dateLocaleIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso.slice(0, 10);
  }
  return dateVersCle(d);
}
