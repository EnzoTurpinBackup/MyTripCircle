# MyTripCircle

Application mobile collaborative de planification de voyages entre amis, construite avec React Native (Expo). Elle consomme l'API REST [MyTripCircle-API](https://github.com/MyTripCircle/MyTripCircle-API), dépôt séparé et source unique des données, partagée avec le client [MyTripCircle-Web](https://github.com/MyTripCircle/MyTripCircle-Web).

## Fonctionnalités

### Voyages

- Créer, modifier et organiser des voyages
- Inviter des amis avec des rôles (propriétaire, éditeur, lecteur)
- Partager un voyage publiquement ou entre amis
- Deep links pour les invitations (`mytripcircle://invitation/:token`)

### Réservations

- Gérer vols, trains, hôtels, restaurants et activités
- Scanner des billets (lecture du code-barres BCBP via ML Kit, sur l'appareil) — _OCR par IA pour les billets sans code-barres : prévu, non activé_
- Suivi du statut (confirmé, en attente, annulé)

### Idées & Itinéraires IA

- Génération d'itinéraires par ville et nombre de jours (Groq — Llama 3.3 70B)
- Activités matin / après-midi / soir avec conseils
- Filtrage par catégorie (attractions, gastronomie, aventure…)
- Création de voyage en un clic depuis un itinéraire généré
- 10 générations par utilisateur par 24 h, cache de 7 jours

### Adresses

- Sauvegarde de lieux avec autocomplétion Google Places
- Coordonnées, notes, évaluations et photos

### Amis

- Envoi et réception de demandes d'amis
- Invitation par lien / email
- Notification email lors de l'inscription d'un ami invité

### Authentification

- Email / mot de passe avec vérification OTP
- Sign in with Apple (vérification JWT côté serveur)
- Google OAuth
- Réinitialisation de mot de passe par email
- JWT + refresh tokens

### Autres

- Internationalisation français / anglais (i18next)
- Thème clair / sombre
- Skeleton loaders sur toutes les pages
- Notifications push

## Stack technique

### Frontend

| Technologie | Usage |
|---|---|
| React Native 0.81 | Framework mobile |
| Expo ~54 | Plateforme de développement |
| TypeScript ~5.9 | Typage statique |
| React Navigation | Navigation (stack, tabs, drawer) |
| React Native Paper | Composants Material UI |
| React Native Maps | Intégration cartographique |
| i18next | Internationalisation |
| AsyncStorage | Persistance locale |

### API

Le serveur — Express 5, MongoDB, JWT, chiffrement des données personnelles,
génération d'itinéraires par Groq — vit dans le dépôt
[MyTripCircle-API](https://github.com/MyTripCircle/MyTripCircle-API). Ce dépôt
ne contient que le client.

## Structure du projet

```
MyTripCircle/
├── src/
│   ├── components/        # Composants réutilisables (auth, trips, bookings, friends…)
│   ├── screens/           # 41 écrans (auth, voyages, réservations, idées, profil…)
│   ├── contexts/          # État global (Auth, Trips, Friends, Theme, Notifications)
│   ├── hooks/             # Hooks métier (useTripsApi, useBookingForm, useIdeas…)
│   ├── navigation/        # AppNavigator — Stack + Tab navigation
│   ├── services/          # Communication API (ApiService, PlacesService…)
│   ├── utils/             # Helpers (i18n, geocoding, avatar…)
│   ├── types/             # Interfaces TypeScript
│   ├── theme/             # Couleurs, typographie, espacements
│   └── config/            # Configuration API
├── assets/                # Icônes et splash screen
├── App.tsx                # Composant racine
├── app.json               # Configuration Expo
├── eas.json               # Profils de build EAS
└── package.json
```

## Installation

### Prérequis

- Node.js ≥ 22
- npm
- Expo CLI (`npx expo`)
- Simulateur iOS / émulateur Android (optionnel)

### Configuration

1. Cloner le dépôt

   ```bash
   git clone https://github.com/MyTripCircle/MyTripCircle-Mobile.git
   cd MyTripCircle-Mobile
   ```

2. Installer les dépendances

   ```bash
   npm install
   ```

3. Configurer les variables d'environnement

   Copier `.env.example` en `.env`. Le client n'y lit que les identifiants
   OAuth Google, préfixés `EXPO_PUBLIC_` et donc embarqués dans l'application :
   aucun secret n'y a sa place. Les secrets — base, jetons, chiffrement, clé
   Google Places — appartiennent à l'API.

4. Lancer l'API

   L'API vit dans son propre dépôt,
   [MyTripCircle-API](https://github.com/MyTripCircle/MyTripCircle-API). Le
   client interroge par défaut l'instance déployée : rien à lancer pour
   travailler sur l'interface. Pour développer contre une API locale, cloner ce
   dépôt, y suivre son README, puis pointer `src/config/api.ts` sur
   `http://localhost:4000`.

5. Lancer l'application Expo

   ```bash
   npm start
   ```

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm start` | Lancer Expo |
| `npm run dev` | Détecter l'IP locale puis lancer Expo |
| `npm run ios` | Build et lancement iOS |
| `npm run android` | Build et lancement Android |
| `npm test` | Lancer les tests (client, scripts) |

## Base de données

Le peuplement et le diagnostic de la base relèvent désormais du dépôt
[MyTripCircle-API](https://github.com/MyTripCircle/MyTripCircle-API), qui porte
les scripts `seed`, `seed:dataset`, `test-db` et `mongo` ainsi que les clés de
chiffrement qu'ils requièrent.


## Navigation

### Non authentifié

Welcome → Connexion / Inscription → Vérification OTP → Mot de passe oublié

### Authentifié (5 onglets)

| Onglet | Contenu |
|---|---|
| Voyages | Liste, création, détails, membres, vue publique |
| Réservations | Gestion, scanner de billets, détails |
| Idées | Génération IA d'itinéraires, inspiration par catégorie |
| Adresses | Lieux sauvegardés, intégration Google Places |
| Profil | Paramètres, amis, notifications, abonnement |

## Charte graphique

Palette sable / terracotta :

| Token | Couleur | Hex |
|---|---|---|
| Terra | Accent principal | `#C4714A` |
| Terra Dark | Variante sombre | `#A35830` |
| Sand | Fond principal | `#F5F0E8` |
| Sand Light | Fond secondaire | `#FDFAF5` |
| Ink | Texte principal | `#2A2318` |
| Moss | Accent vert | `#6B8C5A` |
| Sky | Accent bleu | `#5A8FAA` |

Typographie : **Lora** (serif, titres) + **Sora** (sans-serif, corps)

## Collections MongoDB

| Collection | Contenu |
|---|---|
| `users` | Profils, données d'auth |
| `trips` | Voyages, collaborateurs, permissions |
| `bookings` | Réservations, pièces jointes |
| `addresses` | Lieux sauvegardés |
| `friends` | Relations d'amitié |
| `invitations` | Invitations voyage (expiration 7j) |
| `itinerary_cache` | Itinéraires IA générés (TTL 7j) |
| `itinerary_usage` | Limite de génération (TTL 24h) |

## Deep linking

| Schéma | Action |
|---|---|
| `mytripcircle://invitation/:token` | Accepter une invitation voyage |
| `mytripcircle://friend-invite/:token` | Accepter une demande d'ami |
| `mytripcircle://reset-password` | Réinitialiser le mot de passe |

## Licence

MIT
