# Moulin Patron

Application Expo 54 hors ligne pour définir les tarifs, consolider les journées des opérateurs et gérer les remboursements ou annulations de dettes.

## Commandes

```bash
npm install
npm start
npm run lint
npx tsc --noEmit
```

L’écran Synchronisation importe les journées des opérateurs et réexporte une journée fusionnée. Les écrans Dette+ et Dette- permettent de rembourser ou d’annuler un mouvement actif. L’entrée « Graphiques » du menu affiche les représentations de la date choisie.

Consultez le [`README.md`](../README.md) du dépôt pour les règles de fusion et le protocole CSV.
