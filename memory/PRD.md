# MyBase - Personal Life OS

## Contexte du projet
Une application de type "super app" personnelle combinant ERP, base de données, suivi financier et gestion de contenu - tout interconnecté.

## Date de création
27 Février 2026

## User Persona
- Utilisateur unique
- Power user cherchant à centraliser toute sa vie dans une seule application
- Déploiement prévu sur Raspberry Pi 8GB + NAS

## Fonctionnalités Principales (Implémentées)

### Phase 1 - MVP
- [x] Authentification (JWT, inscription, connexion)
- [x] Collections avec couleurs, catégories, schéma de métadonnées
- [x] Inventaire avec tags, métadonnées flexibles, prix, condition, emplacement
- [x] Liste de souhaits avec prix, priorité, URL, date cible
- [x] Projets & Tâches avec couleurs, progression, priorité
- [x] Bibliothèque de contenu (recettes, DIY, tutoriels, éducatif)
- [x] Portefeuille financier (crypto, actions, immobilier)
- [x] Dashboard avec statistiques globales et widgets
- [x] Interface 100% français, dark mode, sidebar collapsible

### Phase 2 - Intégrations
- [x] Prix crypto en temps réel (CoinGecko)
- [x] Alertes de prix (3 types: cible, hausse, baisse)
- [x] Liens bidirectionnels entre items
- [x] Upload de fichiers (images et documents)

### Phase 3 - Fonctionnalités avancées (27 Fév 2026)
- [x] **D: Sous-projets** - Hiérarchie parent/enfant pour les projets avec parent_id
- [x] **D: Types personnalisés** - CRUD pour types custom avec champs définis par l'utilisateur
- [x] **B: Gestion des Tags** - Page dédiée avec CRUD, couleurs, catégories, compteur d'utilisation
- [x] **B: Filtres** - Filtres par catégorie sur la page Tags
- [x] **C: Médias étendus** - Upload de fichiers étendu aux projets et tâches
- [x] **A: Carte Mentale** - Vue graphe interactive avec @xyflow/react, filtrable par type/tag
- [x] **G (partiel): Suppression icône** - Champ icône inutile retiré des collections

## Architecture technique

### Backend (FastAPI)
- MongoDB (FerretDB + PostgreSQL sur Raspberry Pi)
- JWT pour l'authentification
- Upload de fichiers local
- API RESTful avec préfixe /api
- Intégration CoinGecko (httpx)

### Frontend (React)
- Shadcn/UI components
- Recharts pour les graphiques
- @xyflow/react pour la carte mentale
- TailwindCSS
- React Router

### Base de données
Collections: users, collections, inventory, wishlist, projects, tasks, content, portfolio, alerts, custom_types, managed_tags

## Backlog

### P1 - Prochaines tâches
- [ ] **G: Corrections mineures** - Afficher l'espace de stockage restant
- [ ] **E: Portfolio Avancé** - Snapshots mensuels, filtre par type d'actif, historique transactions
- [ ] **F: Alertes améliorées** - Comparateur de prix multi-sites

### P2 - Moyenne priorité
- [ ] Intégration Alpha Vantage API (prix actions) - nécessite clé API
- [ ] Import/Export de données
- [ ] Génération de listes de courses depuis recettes
- [ ] Tracking d'annonces (collections)
- [ ] Suivi immobilier détaillé

### P3 - Nice to have
- [ ] Notifications email des alertes
- [ ] Mode hors ligne
- [ ] Synchronisation multi-devices
- [ ] Thèmes personnalisables

## Notes techniques
- CoinGecko tier gratuit : 10-15 appels/minute
- Déploiement: Raspberry Pi avec FerretDB + PostgreSQL (Docker), Nginx reverse proxy, systemd
- Le stockage de fichiers est en local, compatible NAS
