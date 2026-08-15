# Moulin de Riz

Deux applications mobiles Expo 54 fonctionnant hors ligne :

- **moulin-operateur** : clients, encaissements, clôture et dettes au moulin ;
- **moulin-patron** : tarifs, journées consolidées et supervision/action sur les dettes.

## Installation et contrôles

```bash
cd moulin-operateur && npm install && npm run lint && npm test
cd ../moulin-patron && npm install && npm run lint
```

Démarrage : `npx expo start` dans le dossier de l’application voulue.

## Données et règles métier

Chaque application possède une base SQLite locale `moulin_v2.db`. Il n’existe pas de serveur central.

- À son arrivée, un client mémorise le tarif `Ar/kg` et `Ar/Kpk` courant. Ces valeurs historiques servent ensuite au paiement et à la clôture, même si le patron modifie les tarifs.
- Un client non encaissé un jour précédent devient `non_paye` et génère une Dette+ automatique.
- Les dettes sont un journal : une annulation ajoute un contre-mouvement, un remboursement est monotone.
- Une suppression de client est logique (`supprime = 1`) afin de pouvoir être transmise aux autres appareils.

## Synchronisation CSV

Les échanges sont manuels (partage à proximité, Bluetooth, e-mail, etc.). Les CSV v2 incluent une ligne méta, les données et un hash SHA-256 de contrôle.

- Les deux applications peuvent importer et exporter une journée.
- Une absence dans un fichier ne supprime jamais une ligne locale.
- Les suppressions explicites sont fusionnées comme des données.
- Un statut final ne régresse pas (`en_attente < non_paye < paye`). À statut égal, `updatedAt`, puis `updatedByDeviceId`, déterminent la modification gagnante.
- Les anciens CSV v1 restent importables. Le tarif local courant, ou à défaut 100 Ar/kg et 500 Ar/Kpk, est attribué à leurs clients.
- Le journal complet des dettes est réexporté ; les UUID rendent les imports idempotents.

Le hash détecte une corruption, mais ne constitue pas une signature cryptographique d’un expéditeur de confiance.
