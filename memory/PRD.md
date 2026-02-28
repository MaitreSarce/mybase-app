# MyBase - Personal Life OS

## Contexte du projet
Application "super app" personnelle combinant ERP, base de données, suivi financier et gestion de contenu. Déployée sur Raspberry Pi 8GB + NAS.

## Fonctionnalités Implémentées

### Phase 1-3 - MVP + Intégrations + Avancé
- [x] Authentification JWT, Dashboard, Dark mode, Sidebar collapsible
- [x] Collections, Inventaire, Souhaits, Projets & Tâches, Contenu, Portefeuille
- [x] CoinGecko crypto, Alertes, Liens bidirectionnels, Upload fichiers
- [x] Sous-projets, Types custom contenu, Carte Mentale, Portfolio snapshots/transactions

### Phase 4-6 - Corrections UI + Priorités (28 Fév 2026)
- [x] Fix suppression (onSelect, onClick sur contenu pas Card, onCloseAutoFocus)
- [x] Tags auto-découverts + vue détail
- [x] Liens via dialogue (type="button"), 3 petits points toujours visibles
- [x] Multi-sélection sur TOUS les filtres, Types de contenu personnalisés (key fix)

### Phase 7 - Fonctionnalités majeures (28 Fév 2026)
- [x] Carte Mentale améliorée : Focus connexions, 2 MultiSelect (Sections + Tags), drag links
- [x] Vue Carte/Tableau sur Collections (ViewToggle + Table)
- [x] Page Calendrier : Widget, événements, MultiSelect (Sections, Tags), plage temps
- [x] **Champ URL/Lien sur Contenu** : Backend (ContentCreate/Update/Response), frontend (input + affichage carte avec icône lien externe)
- [x] **Liens croisés Contenu** : ItemLinksManager intégré dans le dialogue d'édition contenu

## Architecture
- **Backend**: FastAPI, MongoDB (FerretDB+PostgreSQL), JWT
- **Frontend**: React, Shadcn/UI, TailwindCSS, Recharts, @xyflow/react
- **DB Collections**: users, collections, inventory, wishlist, projects, tasks, content, portfolio, alerts, managed_tags, custom_types, portfolio_transactions, portfolio_snapshots

## Backlog
### P0
- [ ] Alertes améliorées / Comparateur de prix
### P1
- [ ] Intégration Alpha Vantage (actions), Import/Export données, Refactoring backend
### P2
- [ ] Notifications email, Mode hors ligne, Thèmes, Recherche Ctrl+K
