# MyBase - Personal Life OS

## Contexte du projet
Application "super app" personnelle combinant ERP, base de données, suivi financier et gestion de contenu - tout interconnecté. Déployée sur Raspberry Pi 8GB + NAS.

## Fonctionnalités Implémentées

### Phase 1 - MVP
- [x] Authentification JWT
- [x] Collections, Inventaire, Liste de souhaits, Projets & Tâches
- [x] Bibliothèque de contenu, Portefeuille financier
- [x] Dashboard, Dark mode, Sidebar collapsible

### Phase 2 - Intégrations
- [x] Prix crypto CoinGecko, Alertes de prix
- [x] Liens bidirectionnels, Upload fichiers

### Phase 3 - Fonctionnalités avancées (27 Fév 2026)
- [x] Sous-projets (parent_id), Types personnalisés de contenu
- [x] Carte Mentale (@xyflow/react)
- [x] Stockage visible dans sidebar, Suppression icône collections
- [x] Portfolio: Snapshots, Évolution, Transactions, Filtre type actif

### Phase 4 - Corrections et Améliorations (28 Fév 2026)
- [x] **Suppression types personnalisés collections** (inutiles)
- [x] **Fix suppression items** (stopPropagation sur tous les dropdowns)
- [x] **Clic sur cartes ouvre le dialog/détail** (toutes les pages)
- [x] **Tags auto-découverts** depuis tous les items (page Tags réécrite)
- [x] **Filtre par tag** ajouté sur Inventaire, Souhaits, Projets, Contenu
- [x] **Types de contenu personnalisés** (champ texte libre pour nouveau type)
- [x] **Liens croisés** (ItemLinksManager dans tous les dialogues d'édition)
- [x] **Collections ↔ Souhaits** (collection_id sur wishlist, vue détail montre acquis + souhaits)
- [x] Fix: collection_id manquant dans création wishlist (bug trouvé par tests)

### Phase 5 - Corrections critiques UI (28 Fév 2026)
- [x] **Fix suppression: onClick → onSelect** sur CollectionsPage et ProjectsPage (Radix UI compliance)
- [x] **Suppression window.confirm** remplacé par suppression directe + toast
- [x] **Collection detail: édition sur place** au lieu de navigation (inventaire + souhaits)
- [x] **TagsPage: vue détail par tag** avec items groupés par source + édition en modale
- [x] **API /api/tags/{tag_name}/items** endpoint ajouté pour récupérer items par tag
- [x] **Multi-sélection filtres** (composant MultiSelect intégré: Inventaire, Souhaits, Contenu)
- [x] **Vue Carte/Tableau** (composant ViewToggle intégré: Inventaire, Souhaits, Contenu)

## Architecture
- **Backend**: FastAPI, MongoDB (FerretDB+PostgreSQL sur RPi), JWT
- **Frontend**: React, Shadcn/UI, TailwindCSS, Recharts, @xyflow/react
- **DB Collections**: users, collections, inventory, wishlist, projects, tasks, content, portfolio, alerts, managed_tags, custom_types, portfolio_transactions, portfolio_snapshots

## Backlog

### P0
- [ ] **F: Alertes améliorées** — Comparateur de prix multi-sites

### P1
- [ ] Intégration Alpha Vantage (actions) - clé API requise
- [ ] Import/Export de données
- [ ] Refactoring backend (server.py → modules)

### P2
- [ ] Notifications email, Mode hors ligne, Thèmes personnalisables
