# MyTripCircle

Application mobile collaborative de planification de voyages entre amis, construite avec React Native (Expo) et un backend Express.js / MongoDB.

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

### Backend

| Technologie | Usage |
|---|---|
| Express.js 5 | Framework web |
| MongoDB (driver natif) | Base de données |
| JWT + Bcrypt | Authentification et hachage |
| Nodemailer | Envoi d'emails |
| Helmet + Rate Limit | Sécurité |
| Groq API | Génération d'itinéraires IA |

## Structure du projet

```
MyTripCircle/
├── src/
│   ├── components/        # Composants réutilisables (auth, trips, bookings, friends…)
│   ├── screens/           # ~36 écrans (auth, voyages, réservations, idées, profil…)
│   ├── contexts/          # État global (Auth, Trips, Friends, Theme, Notifications)
│   ├── hooks/             # Hooks métier (useTripsApi, useBookingForm, useIdeas…)
│   ├── navigation/        # AppNavigator — Stack + Tab navigation
│   ├── services/          # Communication API (ApiService, PlacesService…)
│   ├── utils/             # Helpers (i18n, geocoding, avatar…)
│   ├── types/             # Interfaces TypeScript
│   ├── theme/             # Couleurs, typographie, espacements
│   └── config/            # Configuration API
├── server/
│   ├── index.js           # Point d'entrée Express
│   ├── config.js          # Variables d'environnement
│   ├── db.js              # Connexion MongoDB, index, validators
│   ├── middleware/         # Auth JWT, rate limiter, error handler
│   ├── routes/            # auth, users, trips, bookings, addresses, friends, invitations, itinerary
│   └── utils/             # Email templates, helpers
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
- Instance MongoDB (locale ou Atlas)
- Simulateur iOS / émulateur Android (optionnel)

### Configuration

1. Cloner le dépôt

   ```bash
   git clone https://github.com/EnzoTurpin/MyTripCircle.git
   cd MyTripCircle
   ```

2. Installer les dépendances

   ```bash
   npm install
   ```

3. Configurer les variables d'environnement

   Créer un fichier `.env` à la racine :

   ```env
   # Base de données
   MONGODB_URI=mongodb+srv://...
   DB_NAME=mytripcircle

   # Authentification
   JWT_SECRET=votre_secret_jwt
   REFRESH_SECRET=votre_secret_refresh

   # Serveur
   API_PORT=4000
   API_BASE_URL=http://localhost:4000

   # Google Places (autocomplétion adresses)
   EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=votre_clé_google

   # Email (Gmail)
   MAIL_USER=votre_email@gmail.com
   MAIL_PASS=votre_app_password

   # IA — Génération d'itinéraires
   GROQ_API_KEY=votre_clé_groq

   # Apple Sign-In (optionnel)
   APPLE_APP_ID=com.votre.bundle.id
   ```

4. Lancer le serveur backend

   ```bash
   npm run server
   ```

5. Lancer l'application Expo

   ```bash
   npm start
   ```

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm start` | Lancer Expo |
| `npm run dev` | Lancer Expo + serveur en parallèle |
| `npm run server` | Lancer le backend Express |
| `npm run ios` | Build et lancement iOS |
| `npm run android` | Build et lancement Android |
| `npm test` | Lancer les tests (client, serveur, scripts) |
| `npm run seed` | Alimenter la base avec le jeu de démonstration |
| `npm run test-db` | Vérifier la connexion à MongoDB et l'état de la base |

## Base de données — vérification et jeu de démonstration

Deux commandes couvrent la mise en route d'une base neuve. Elles se lancent
depuis la racine du dépôt, sans dépendance supplémentaire à installer.

### Variables d'environnement requises

| Variable | Utilisée par | Rôle |
|---|---|---|
| `MONGODB_URI` | `test-db`, `seed` | Chaîne de connexion (`mongodb://` ou `mongodb+srv://`) |
| `DB_NAME` | `test-db`, `seed` | Nom de la base ; `mytripcircle` par défaut |
| `ENCRYPTION_KEY` | `seed` | Clé AES-256 (64 caractères hexadécimaux) — les données personnelles sont chiffrées en base |
| `HMAC_KEY` | `seed` | Clé HMAC (64 caractères hexadécimaux) — empreintes de recherche |

Toutes figurent dans `.env.example`. Une commande lancée sans ces variables
s'arrête immédiatement en les nommant, sans tenter de se connecter.

### Ordre de mise en route

```bash
npm run server   # premier démarrage : crée les index et les validateurs
npm run seed     # écrit le jeu de démonstration
npm run test-db  # vérifie connexion, collections et index critiques
```

### `npm run test-db` — test de connexion

Ouvre la connexion, envoie un `ping`, liste les collections avec leur nombre de
documents, puis vérifie la présence des index critiques (unicité de
`users.emailHash`, index TTL portant les durées de conservation). Sort en code
`0` si tout est vérifié, `1` sinon — connexion impossible, variable manquante
ou index absent — avec le message de correction correspondant. Aucun contenu de
document n'est affiché, et la chaîne de connexion est journalisée sans ses
identifiants.

### `npm run seed` — alimentation initiale

Écrit un jeu de démonstration de 15 documents : 3 comptes vérifiés, 2 voyages
(dont un partagé avec un collaborateur), 4 réservations couvrant les quatre
types gérés, 3 adresses, la relation d'amitié réciproque et un abonnement
premium.

| Option | Effet |
|---|---|
| _(aucune)_ | Écrit le jeu ; refuse si la base contient des documents étrangers |
| `--force` | Écrit malgré la présence d'autres documents (aucun n'est supprimé) |
| `--clean` | Retire le jeu de démonstration, et lui seul |

Le script est **idempotent** : chaque document porte un identifiant figé, une
seconde exécution met à jour les mêmes documents au lieu d'en créer d'autres.
Il refuse de s'exécuter sur une base contenant des données qu'il n'a pas
écrites, ainsi que lorsque `NODE_ENV=production`, sauf `--force` explicite.

Les comptes créés utilisent le domaine `example.com` (réservé à la
documentation par la RFC 2606) et des numéros de la plage `+3363998xxxx`
(réservée à la fiction par l'ARCEP) : **aucune donnée personnelle réelle** ne
figure dans le jeu, et aucun secret n'y est écrit en dur.

| Compte | Rôle dans le jeu |
|---|---|
| `alice.demo@example.com` | Propriétaire des deux voyages, abonnement premium |
| `bruno.demo@example.com` | Collaborateur du voyage « Week-end à Porto » |
| `chloe.demo@example.com` | Compte sans voyage, offre gratuite |

Mot de passe commun : `Demo!Passw0rd` — valeur de démonstration, sans usage hors
d'une base locale.

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
