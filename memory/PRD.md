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

### Phase 2 - Fonctionnalités avancées ✅

#### 10. Prix crypto en temps réel (CoinGecko)
- [x] API CoinGecko (tier gratuit, sans clé)
- [x] Actualisation automatique des prix BTC, ETH, etc.
- [x] Bouton "Actualiser les prix" sur la page Portfolio
- [x] Support de 15+ cryptos populaires

#### 11. Alertes de prix
- [x] Page dédiée aux alertes
- [x] 3 types d'alertes : prix cible, hausse, baisse
- [x] Support pourcentage ou valeur absolue
- [x] Onglets "En attente" et "Déclenchées"
- [x] Vérification manuelle des alertes

#### 12. Liens entre items
- [x] Liens bidirectionnels entre tous types d'items
- [x] Recherche globale pour lier
- [x] Affichage des liens avec type et nom
- [x] Suppression des liens

#### 13. Upload de fichiers
- [x] Composant FileUploader réutilisable
- [x] Support images et documents
- [x] Stockage local (compatible NAS)
- [x] Prévisualisation des images
- [x] Téléchargement et suppression

## Architecture technique

### Backend (FastAPI)
- MongoDB pour le stockage
- JWT pour l'authentification
- Upload de fichiers local
- API RESTful avec préfixe /api
- Intégration CoinGecko (httpx)

### Frontend (React)
- Shadcn/UI components
- Recharts pour les graphiques
- TailwindCSS
- React Router

## Backlog (P1/P2)

### P1 - Haute priorité
- [ ] Intégration Alpha Vantage API (prix actions) - nécessite clé API
- [ ] Vue matricielle/arborescente
- [ ] Notifications push des alertes

### P2 - Moyenne priorité
- [ ] Éditeur de schéma de métadonnées avancé
- [ ] Import/Export de données
- [ ] Génération de listes de courses depuis recettes
- [ ] Tracking d'annonces (collections)
- [ ] Suivi immobilier détaillé (charges, rendement)
- [ ] Historique des valeurs (graphiques temporels)

### P3 - Nice to have
- [ ] Notifications email des alertes
- [ ] Mode hors ligne
- [ ] Synchronisation multi-devices
- [ ] API publique documentée
- [ ] Thèmes personnalisables

## Prochaines étapes recommandées
1. Obtenir une clé Alpha Vantage pour le suivi des actions
2. Implémenter les notifications push des alertes
3. Créer la vue matricielle pour l'organisation

## Notes techniques
- CoinGecko tier gratuit : 10-15 appels/minute
- Les clés API Alpha Vantage sont nécessaires pour les actions
- Le stockage de fichiers est en local, compatible NAS
- La base MongoDB peut être sauvegardée facilement
