# MyBase - Personal Life OS

## Contexte du projet
Application "super app" personnelle combinant ERP, base de données, suivi financier et gestion de contenu. Déployée sur Raspberry Pi 8GB + NAS.

## Fonctionnalités Implémentées

### Phase 1-3 - MVP + Intégrations + Avancé
- [x] Authentification JWT, Dashboard, Dark mode, Sidebar collapsible
- [x] Collections, Inventaire, Souhaits, Projets & Tâches, Contenu, Portefeuille
- [x] CoinGecko crypto, Alertes, Liens bidirectionnels, Upload fichiers
- [x] Sous-projets, Types custom contenu, Carte Mentale, Portfolio snapshots/transactions

### Phase 4-5 - Corrections UI (28 Fév 2026)
- [x] Fix suppression (onSelect, no window.confirm, onClick sur contenu pas Card)
- [x] onCloseAutoFocus sur tous DropdownMenuContent
- [x] Tags auto-découverts + vue détail, API /api/tags/{tag_name}/items

### Phase 6 - Priorités utilisateur (28 Fév 2026)
- [x] Liens via dialogue : type="button" sur tous les boutons ItemLinksManager
- [x] 3 petits points toujours visibles (opacity-0 retiré)
- [x] Multi-sélection sur TOUS les filtres (MultiSelect Popover+Checkboxes)
- [x] Types de contenu personnalisés (key prop fix)

### Phase 7 - Nouvelles fonctionnalités (28 Fév 2026)
- [x] **Carte Mentale améliorée** : Clic sur noeud filtre connexions (dimmed), 2 MultiSelect séparés (Sections + Tags), drag pour créer liens
- [x] **Vue Carte/Tableau** sur Collections (ViewToggle + Table view)
- [x] **Page Calendrier** : Widget calendrier, liste événements, filtres MultiSelect (Sections, Tags), sélecteur plage temps (Semaine/Mois/Année)
- [x] **API /api/calendar/events** : Agrège dates de toutes les sections
- [x] Fix type de contenu personnalisé (Select key prop forçant re-render)
- [x] Liens depuis Contenu (ItemLinksManager déjà intégré)

## Architecture
- **Backend**: FastAPI, MongoDB (FerretDB+PostgreSQL), JWT
- **Frontend**: React, Shadcn/UI, TailwindCSS, Recharts, @xyflow/react
- **Pattern Card/Dropdown**: onClick sur zones contenu internes seulement

## Backlog

### P0
- [ ] Alertes améliorées / Comparateur de prix

### P1
- [ ] Intégration Alpha Vantage (actions) - clé API requise
- [ ] Import/Export de données
- [ ] Refactoring backend (server.py → modules)

### P2
- [ ] Notifications email, Mode hors ligne, Thèmes personnalisables
- [ ] Recherche globale Ctrl+K
