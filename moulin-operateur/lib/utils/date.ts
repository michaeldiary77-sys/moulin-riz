/**
 * Retourne la date du jour au format AAAA-MM-JJ en heure locale de
 * l'appareil (getFullYear/getMonth/getDate), et non en UTC.
 * C'est volontaire : Madagascar est à UTC+3, or
 * new Date().toISOString().slice(0, 10) donne la date en UTC, ce qui
 * classerait les clients sous la mauvaise date pendant les 3 premières
 * heures après minuit en heure locale.
 */
export function dateDuJourLocal(): string {
  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = String(maintenant.getMonth() + 1).padStart(2, '0');
  const jour = String(maintenant.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}
