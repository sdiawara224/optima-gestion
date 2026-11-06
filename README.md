# Optima Gestion

Application web de gestion pour commerçants et PME : **stock, ventes, clients, dépenses et rapports** dans une seule interface en français, avec montants en FCFA.

Développée en React + TypeScript + Vite. Les données sont enregistrées localement dans le navigateur (aucun serveur, aucun compte requis).

## Démarrer

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de production dans dist/
npm run preview  # prévisualiser le build
```

## Fonctionnalités

| Module | Contenu |
| --- | --- |
| **Tableau de bord** | CA du mois, bénéfice net, valeur du stock, créances, courbe 6 mois, alertes de stock, top produits, meilleurs clients |
| **Ventes & factures** | Panier multi-lignes, remise, moyens de paiement (Espèces, Wave, Orange Money, MTN, Moov, virement), encaissements partiels, facture imprimable, annulation avec restitution du stock |
| **Stock & produits** | Prix d'achat / vente, marge calculée, quantités, seuil d'alerte, mouvements de stock manuels, filtres par catégorie et stock faible |
| **Clients** | Fiches contact, historique d'achat, chiffre d'affaires cumulé, encours à recouvrer |
| **Dépenses** | Journal par mois, catégories (loyer, salaires, énergie…), répartition graphique |
| **Rapports** | Compte de résultat simplifié, couverture des charges, CA sur 12 mois, répartition des encaissements, export CSV + impression PDF |
| **Paramètres** | Identité de l'entreprise (reprise sur les factures), devise, TVA, export / restauration de sauvegarde JSON, réinitialisation de la démo |

## Structure

```
src/
  App.tsx           Navigation, mise en page, en-tête
  store.tsx         État global (reducer + persistance localStorage) et données de démo
  types.ts          Modèles de données et calculs métier (total, statut, coût)
  lib/format.ts     Formatage monétaire, dates, téléchargements
  lib/stats.ts      Indicateurs, séries, classements
  components/ui.tsx Modale, toasts, badges, graphiques, états vides
  pages/            Dashboard, Products, Sales, Customers, Expenses, Reports, Settings
```

## Notes

- Le stock est décrémenté à la vente et restauré si la vente est annulée.
- Une vente dont le montant encaissé est inférieur au total passe en *partielle* ou *impayée* et alimente les créances.
- Interface responsive : barre latérale sur ordinateur, barre d'onglets sur mobile ; les factures et rapports sont imprimables (PDF via le navigateur).
- Sauvegardez régulièrement vos données via **Paramètres → Exporter mes données** : la démo vit dans le stockage local du navigateur.
