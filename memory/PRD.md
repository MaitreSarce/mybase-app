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
- [x] Stockage visible dans sidebar
- [x] Portfolio: Snapshots, Évolution, Transactions, Filtre type actif

### Phase 4 - Corrections UI (28 Fév 2026)
- [x] Fix suppression items (onSelect + no window.confirm)
- [x] Clic sur cartes ouvre le dialog d'édition (toutes pages)
- [x] Tags auto-découverts + vue détail par tag (TagsPage réécrite)
- [x] Filtre par tag, Types de contenu personnalisés
- [x] Liens croisés (ItemLinksManager dans dialogues)
- [x] Collections ↔ Souhaits (collection_id sur wishlist)

### Phase 5 - Fix critique Dropdown/Card interaction (28 Fév 2026)
- [x] **Fix définitif suppression** : onClick retiré du `<Card>`, mis sur les zones de contenu uniquement
- [x] **Pattern appliqué sur TOUTES les pages** : CollectionsPage, InventoryPage, WishlistPage, ContentPage, ProjectsPage
- [x] **onCloseAutoFocus={(e) => e.preventDefault()}** sur tous les DropdownMenuContent
- [x] **API /api/tags/{tag_name}/items** ajouté pour récupérer items par tag
- [x] **Multi-sélection filtres** (composant MultiSelect)
- [x] **Vue Carte/Tableau** (composant ViewToggle)

## Architecture
- **Backend**: FastAPI, MongoDB (FerretDB+PostgreSQL sur RPi), JWT
- **Frontend**: React, Shadcn/UI, TailwindCSS, Recharts, @xyflow/react
- **Pattern Dropdown/Card**: Ne jamais mettre onClick sur le Card quand il contient un DropdownMenu. Mettre onClick sur les zones de contenu internes seulement.

## Backlog

### P0
- [ ] Alertes améliorées / Comparateur de prix

### P1
- [ ] Intégration Alpha Vantage (actions) - clé API requise
- [ ] Import/Export de données
- [ ] Refactoring backend (server.py → modules)

### P2
- [ ] Notifications email, Mode hors ligne, Thèmes personnalisables
