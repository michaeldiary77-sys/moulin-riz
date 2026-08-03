import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Profil actuellement actif pendant la session en cours.
 * Volontairement non persistant : aucune sauvegarde SQLite/stockage,
 * tout redémarrage complet (cold start) repart à vide.
 */
export type ProfilActif = { id: number; nom: string } | null;

type ProfilActifContextValue = {
  profilActif: ProfilActif;
  definirProfilActif: (profil: ProfilActif) => void;
};

const ProfilActifContext = createContext<ProfilActifContextValue>({
  profilActif: null,
  definirProfilActif: () => {},
});

/**
 * Composant qui enveloppe l'app et garde le profil actif en mémoire (state React uniquement).
 */
export function ProfilActifProvider({ children }: { children: ReactNode }) {
  const [profilActif, setProfilActif] = useState<ProfilActif>(null);

  return (
    <ProfilActifContext.Provider value={{ profilActif, definirProfilActif: setProfilActif }}>
      {children}
    </ProfilActifContext.Provider>
  );
}

/**
 * Hook pour lire/modifier le profil actif depuis n'importe quel écran.
 */
export function useProfilActif() {
  return useContext(ProfilActifContext);
}
