# MyBase - Personal Life OS

## Contexte du projet
Une application de type "super app" personnelle combinant ERP, base de données, suivi financier et gestion de contenu - tout interconnecté.

## Date de création
27 Février 2026

## User Persona
- Utilisateur unique, power user
- Déploiement sur Raspberry Pi 8GB + NAS

## Fonctionnalités Implémentées

### Phase 1 - MVP
- [x] Authentification JWT, inscription, connexion
- [x] Collections avec couleurs, catégories, schéma de métadonnées
- [x] Inventaire avec tags, métadonnées flexibles, prix, condition
- [x] Liste de souhaits avec prix, priorité, URL, date cible
- [x] Projets & Tâches avec couleurs, progression, priorité
- [x] Bibliothèque de contenu (recettes, DIY, tutoriels)
- [x] Portefeuille financier (crypto, actions, immobilier)
- [x] Dashboard avec statistiques globales
- [x] Interface 100% français, dark mode, sidebar collapsible

### Phase 2 - Intégrations
- [x] Prix crypto en temps réel (CoinGecko)
- [x] Alertes de prix (cible, hausse, baisse)
- [x] Liens bidirectionnels entre items
- [x] Upload de fichiers (images et documents)

### Phase 3 - Fonctionnalités avancées (27 Fév 2026)
- [x] **D: Sous-projets** — Hiérarchie parent/enfant
- [x] **D: Types personnalisés** — CRUD types custom avec champs définis
- [x] **B: Gestion des Tags** — Page /tags avec CRUD, couleurs, catégories, compteur
- [x] **C: Médias étendus** — Upload fichiers pour projets et tâches
- [x] **A: Carte Mentale** — Vue graphe interactive /mindmap (@xyflow/react)
- [x] **G: Suppression icône** — Champ icône retiré des collections
- [x] **G: Stockage** — Affichage espace de stockage dans la sidebar
- [x] **E: Portfolio Avancé** — Snapshots mensuels, graphique évolution, historique transactions (achats/ventes), onglets (Actifs, Graphiques, Évolution, Transactions), filtre par type d'actif

## Architecture technique
- **Backend**: FastAPI, MongoDB (FerretDB+PostgreSQL sur RPi)
- **Frontend**: React, Shadcn/UI, TailwindCSS, Recharts, @xyflow/react
- **DB Collections**: users, collections, inventory, wishlist, projects, tasks, content, portfolio, alerts, custom_types, managed_tags, portfolio_transactions, portfolio_snapshots

## Backlog

### P0 - Prochaine tâche
- [ ] **F: Alertes améliorées** — Comparateur de prix multi-sites

### P1
- [ ] Intégration Alpha Vantage API (prix actions) - nécessite clé API
- [ ] Import/Export de données
- [ ] Refactoring backend (découper server.py en modules)

### P2
- [ ] Notifications email des alertes
- [ ] Mode hors ligne
- [ ] Thèmes personnalisables
