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

### Phase 1 - MVP ✅

#### 1. Authentification
- [x] Inscription avec email/mot de passe
- [x] Connexion JWT
- [x] Sessions persistantes

#### 2. Collections
- [x] CRUD complet
- [x] Couleurs et catégories personnalisables
- [x] Compteur d'items automatique
- [x] Schéma de métadonnées personnalisable (structure)

#### 3. Inventaire
- [x] Items avec métadonnées flexibles
- [x] Système de tags
- [x] Prix d'achat et valeur actuelle
- [x] État et condition
- [x] Emplacement
- [x] Liaison aux collections

#### 4. Liste de souhaits (Wishlist)
- [x] Prix et URL de suivi
- [x] Priorité (1-5)
- [x] Date cible
- [x] Statut acheté/non acheté
- [x] Tags

#### 5. Projets & Tâches
- [x] Projets avec couleurs
- [x] Tâches assignables aux projets
- [x] Priorités et dates d'échéance
- [x] Progression automatique
- [x] Toggle complété/non complété

#### 6. Bibliothèque de contenu
- [x] Recettes
- [x] DIY
- [x] Tutoriels
- [x] Contenu éducatif
- [x] Corps en Markdown
- [x] Tags et catégories

#### 7. Portefeuille financier
- [x] Crypto-monnaies
- [x] Actions
- [x] Immobilier
- [x] Autres actifs
- [x] Calcul automatique P&L
- [x] Graphiques d'allocation (Pie chart)
- [x] Graphiques comparatifs (Bar chart)

#### 8. Dashboard
- [x] Statistiques globales
- [x] Widgets de résumé
- [x] Valeur totale du portefeuille
- [x] Tâches récentes
- [x] Items récents

#### 9. Interface utilisateur
- [x] Interface 100% en français
- [x] Design dark mode professionnel
- [x] Sidebar collapsible
- [x] Recherche globale (structure)
- [x] Responsive mobile

## Architecture technique

### Backend (FastAPI)
- MongoDB pour le stockage
- JWT pour l'authentification
- Upload de fichiers local
- API RESTful avec préfixe /api

### Frontend (React)
- Shadcn/UI components
- Recharts pour les graphiques
- TailwindCSS
- React Router

## Backlog (P1/P2)

### P1 - Haute priorité
- [ ] Intégration CoinGecko API (prix crypto temps réel)
- [ ] Intégration Alpha Vantage API (prix actions temps réel)
- [ ] Liens entre items (relations cross-collections)
- [ ] Upload de fichiers/photos aux items
- [ ] Vue matricielle/arborescente

### P2 - Moyenne priorité
- [ ] Éditeur de schéma de métadonnées avancé
- [ ] Import/Export de données
- [ ] Génération de listes de courses depuis recettes
- [ ] Tracking d'annonces (collections)
- [ ] Suivi immobilier détaillé (charges, rendement)
- [ ] Historique des valeurs (graphiques temporels)

### P3 - Nice to have
- [ ] Notifications de prix (alertes)
- [ ] Mode hors ligne
- [ ] Synchronisation multi-devices
- [ ] API publique documentée
- [ ] Thèmes personnalisables

## Prochaines étapes recommandées
1. Intégrer les APIs de prix en temps réel (CoinGecko/Alpha Vantage)
2. Implémenter le système de liens entre items
3. Ajouter l'upload de fichiers/photos
4. Créer la vue matricielle pour l'organisation

## Notes techniques
- Les clés API CoinGecko et Alpha Vantage seront nécessaires pour le suivi de prix temps réel
- Le stockage de fichiers est prévu en local, compatible NAS futur
- La base MongoDB peut être sauvegardée facilement
