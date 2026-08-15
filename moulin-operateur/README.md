# Moulin Opérateur

Application Expo 54 hors ligne pour enregistrer les clients, les paiements, les clôtures et les dettes du moulin.

## Commandes

```bash
npm install
npm start
npm run lint
npx tsc --noEmit
npm test
```

L’application mémorise dans SQLite les tarifs historiques de chaque client. L’écran Synchronisation permet d’importer/exporter les journées, d’importer les tarifs du patron et d’échanger le journal des dettes.

Consultez le [`README.md`](../README.md) du dépôt pour les règles de fusion et le protocole CSV.
