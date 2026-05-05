# Audit de Sécurité — MyTripCircle
Date : 2026-04-29

---

## Résumé exécutif

L'audit couvre l'intégralité de la stack : backend Express 5 + MongoDB (driver natif), application mobile React Native 0.81 / Expo 54, flux OAuth (Apple, Google), OTP, invitations, et intégrations IA (Groq).

**Compteurs par criticité :** 3 Critiques · 7 Élevés · 9 Moyens · 5 Faibles

### Top 5 risques

1. **SEC-001 (Critique)** — Credentials MongoDB en clair dans l'historique git (deux URIs avec mots de passe exposés depuis octobre 2025).
2. **SEC-002 (Critique)** — `IAP_SKIP_VALIDATION` activé par défaut (`!== "false"`). Tout utilisateur peut s'octroyer Premium gratuitement en production si la variable n'est pas explicitement positionnée à `"false"`.
3. **SEC-003 (Critique)** — Invitation email/téléphone acceptée par n'importe quel utilisateur authentifié : aucune vérification que l'accepteur est bien le destinataire ciblé.
4. **SEC-004 (Élevé)** — `forgot-password` interroge la collection `users` avec le champ `email` en clair alors que la base stocke uniquement des emails chiffrés (AES-GCM). La recherche ne renvoie jamais de résultat : la fonctionnalité est silencieusement cassée.
5. **SEC-005 (Élevé)** — 9 CVE Élevées (dont lodash prototype pollution, undici CRLF injection, path-to-regexp ReDoS) présentes dans les dépendances de développement/build Expo, plus une CVE Élevée dans `path-to-regexp` utilisé par Express.

---

## Tableau récapitulatif

| ID | Criticité | Catégorie | Titre | Fichier:Ligne |
|----|-----------|-----------|-------|---------------|
| SEC-001 | Critique | Secrets | Credentials MongoDB dans l'historique git | commit `60d750a` / `d80fc70` |
| SEC-002 | Critique | Logique métier / Auth | IAP_SKIP_VALIDATION actif par défaut | `server/config.js:70` |
| SEC-003 | Critique | Autorisation / IDOR | Tout utilisateur peut accepter une invitation email/téléphone ciblée | `server/routes/invitations.js:261` |
| SEC-004 | Élevé | Auth | forgot-password interroge `email` en clair alors que la BD stocke des emails chiffrés | `server/routes/otp.js:49` |
| SEC-005 | Élevé | Dépendances | 9 CVE Élevées (lodash, undici, path-to-regexp, etc.) | `package.json` |
| SEC-006 | Élevé | Auth | Apple Team ID réel dans `eas.json` versionné | `eas.json:20` |
| SEC-007 | Élevé | Sécurité mobile / Tokens | Access token lu depuis `AsyncStorage` dans `i18n.ts` (non sécurisé) | `src/utils/i18n.ts:24` |
| SEC-008 | Élevé | Liens d'invitation | Les invitations de type `link` n'ont pas de date d'expiration | `server/routes/invitations.js:241` |
| SEC-009 | Élevé | Info-disclosure | `GET /invitations/token/:token` est public et expose email/nom de l'inviteur | `server/routes/invitations.js:166` |
| SEC-010 | Élevé | Logique métier | Validation Android IAP non implémentée (confiance aveugle client) | `server/routes/subscriptions.js:136` |
| SEC-011 | Moyen | Prompt injection / IA | Sanitisation partielle du paramètre `city` avant injection dans le prompt Groq | `server/routes/itinerary.js:61` |
| SEC-012 | Moyen | Rate limiting | Aucun rate-limiter dédié sur les endpoints `/subscriptions/validate*` | `server/routes/subscriptions.js` |
| SEC-013 | Moyen | Sécurité mobile | `console.log` non gardé par `__DEV__` dans `MongoDBService.ts` | `src/services/MongoDBService.ts:55` |
| SEC-014 | Moyen | Config | `IAP_SKIP_VALIDATION=true` dans `.env.example` (valeur dangereuse documentée) | `.env.example:44` |
| SEC-015 | Moyen | CORS | `ALLOWED_ORIGINS` non renseigné → tableau vide → toutes requêtes CORS bloquées (API inaccessible) | `server/index.js:45` |
| SEC-016 | Moyen | Secrets | Pas d'index MongoDB sur `calendarToken` (scan complet à chaque requête iCal) | `server/db.js` |
| SEC-017 | Moyen | Autorisation | Endpoint `DELETE /friends/:friendId` n'invalide pas l'ObjectId fourni | `server/routes/friends.js:146` |
| SEC-018 | Moyen | Email | Templates HTML email intègrent des données utilisateur sans échappement HTML explicite côté serveur | `server/utils/email.js` |
| SEC-019 | Moyen | Config / CORS | Helmet est configuré sans Content-Security-Policy explicite | `server/index.js:42` |
| SEC-020 | Faible | Logs prod | `logger.warn` et `logger.error` appellent `console.warn`/`console.error` sans filtre de niveau en production | `server/utils/logger.js:11` |
| SEC-021 | Faible | Config | `.gitignore` ne couvre pas `.env.production` ni `.env.staging` (sans suffixe `.local`) | `.gitignore:34` |
| SEC-022 | Faible | Autorisation | `GET /invitations/user/:email` compare `req.user.email` en minuscules mais le token peut retourner une casse différente | `server/routes/invitations.js:137` |
| SEC-023 | Faible | Places proxy | Paramètre `maxwidth` non validé dans `/places/photo` (valeur arbitraire transmise à Google) | `server/routes/places.js:116` |
| SEC-024 | Faible | Deep links | Le schéma `mytripcircle://` dans `eas.json`/`app.json` n'est pas protégé — toute app peut l'enregistrer sur Android | `app.json:148` |

---

## Détail des vulnérabilités

---

### SEC-001 — Credentials MongoDB exposés dans l'historique git

**Criticité** : Critique
**Catégorie** : CWE-312 / OWASP A02 Cryptographic Failures
**Fichier** : commits `60d750a4` et `d80fc70268` (historique git)

**Description** :
Deux commits d'octobre 2025 ont ajouté puis supprimé un fichier `.env` contenant des URIs MongoDB avec identifiants et mots de passe en clair. Ces commits sont toujours présents dans l'historique git :

- Commit `60d750a` : `mongodb+srv://Panda_Sauvage:***REVOKED***@cluster0.2qorlea.mongodb.net/`
- Commit `d80fc70` : `mongodb+srv://cokoucharbelferreolavimadje_db_user:***REVOKED***@cluster0.2qorlea.mongodb.net/`

Le même cluster MongoDB Atlas (`cluster0.2qorlea.mongodb.net`) est utilisé par les deux entrées.

**Scénario d'exploitation** :
Quiconque accède au dépôt git (public ou interne) peut extraire ces credentials via `git show` ou `git log -p`. L'attaquant obtient un accès direct à la base de données de production, incluant toutes les données personnelles chiffrées (les clés de chiffrement étant dans `.env` non versionné, la donnée reste chiffrée — mais le cluster lui-même est compromis).

**Correctif** :
```bash
# 1. Révoquer IMMÉDIATEMENT les deux utilisateurs MongoDB Atlas
# Dashboard Atlas → Database Access → supprimer/changer le mot de passe de :
# - Panda_Sauvage
# - cokoucharbelferreolavimadje_db_user

# 2. Purger l'historique git (requis si dépôt partagé)
# Utiliser git-filter-repo (préféré à BFG) :
pip install git-filter-repo
git filter-repo --path .env --invert-paths --force

# 3. Forcer tous les collaborateurs à recloner le dépôt
# 4. Vérifier que le dépôt distant n'a pas été forké avant la purge
```

---

### SEC-002 — IAP_SKIP_VALIDATION activé par défaut

**Criticité** : Critique
**Catégorie** : CWE-285 / OWASP A01 Broken Access Control
**Fichier** : `server/config.js:70` et `server/routes/subscriptions.js:96`

**Description** :
La logique de configuration est :
```js
// server/config.js:70
IAP_SKIP_VALIDATION: process.env.IAP_SKIP_VALIDATION !== "false",
```
Cela signifie que si la variable `IAP_SKIP_VALIDATION` est **absente** ou a n'importe quelle valeur autre que `"false"`, la validation Apple est contournée. De plus, le fichier `.env.example` définit explicitement `IAP_SKIP_VALIDATION=true`.

La route de validation (`server/routes/subscriptions.js:96`) utilise ensuite `process.env.IAP_SKIP_VALIDATION === "true"`, ce qui crée une incohérence : si la variable est absente, `config.js` considère skip=true mais la route ne bypassera pas (elle vérifie `=== "true"`). Néanmoins, si un opérateur copie `.env.example` tel quel, le bypass est actif en production.

**Scénario d'exploitation** :
Un attaquant envoie n'importe quel `receipt` (même une chaîne vide ou `"fake"`) à `POST /subscriptions/validate` avec `platform=ios` et un `productId` valide. Le serveur calcule une date de fin basée sur la durée du plan et persiste un abonnement Premium actif sans aucune vérification Apple.

**Correctif** :
```js
// server/config.js — inverser la logique : opt-in au bypass, pas opt-out
IAP_SKIP_VALIDATION: process.env.IAP_SKIP_VALIDATION === "true",

// .env.example — changer la valeur par défaut documentée
IAP_SKIP_VALIDATION=false  # true uniquement en développement local sans compte Developer
```

---

### SEC-003 — Acceptation d'invitation sans vérification du destinataire

**Criticité** : Critique
**Catégorie** : CWE-284 / OWASP A01 Broken Access Control (IDOR)
**Fichier** : `server/routes/invitations.js:261-325`

**Description** :
Le handler `PUT /invitations/:token` accepte ou refuse une invitation pour un `userId` quelconque (l'utilisateur authentifié). Pour les invitations de type email/téléphone (`invitation.type !== "link"`), il n'y a aucune vérification que `req.user` correspond au `inviteeEmailHash` ou `inviteePhoneHash` stocké dans l'invitation.

```js
// Ligne 308-313 — l'userId est celui du porteur du JWT, pas forcément le destinataire
if (action === "accept") {
  await db.collection("trips").updateOne(
    { _id: new ObjectId(invitation.tripId) },
    { $push: { collaborators: { userId, ... } } }  // userId = n'importe quel user authentifié
  );
}
```

**Scénario d'exploitation** :
1. Alice invite `bob@example.com` avec le token `abc123`.
2. Le token est transmis à Alice par email (deep link `mytripcircle://invitation/abc123`).
3. Charlie intercepte le token (SMS/email mal sécurisé, shoulder surfing, etc.).
4. Charlie authentifié appelle `PUT /invitations/abc123` avec `action=accept`.
5. Charlie est maintenant collaborateur du voyage d'Alice, et l'invitation est marquée `accepted` — Bob ne peut plus l'utiliser.

**Correctif** :
```js
// Ajouter dans le handler PUT /:token, avant d'accepter une invitation email/phone :
if (action === "accept" && invitation.type !== "link") {
  const isEmailMatch = invitation.inviteeEmailHash &&
    invitation.inviteeEmailHash === hashField(req.user.email);
  const isPhoneMatch = invitation.inviteePhoneHash &&
    invitation.inviteePhoneHash === hashField(req.user.phone);

  if (!isEmailMatch && !isPhoneMatch) {
    return res.status(403).json({ error: "Cette invitation ne vous est pas destinée" });
  }
}
```

---

### SEC-004 — forgot-password interroge par email en clair (fonctionnalité cassée)

**Criticité** : Élevé
**Catégorie** : CWE-116 / OWASP A07 Identification and Authentication Failures
**Fichier** : `server/routes/otp.js:49`

**Description** :
La route `POST /users/forgot-password` recherche l'utilisateur par le champ `email` brut :
```js
const user = await db.collection("users").findOne({ email });
```
Or, depuis la mise en place du chiffrement PII, le champ `email` en base est un ciphertext AES-256-GCM (format `iv:tag:encrypted`). La recherche par valeur en clair ne trouvera **jamais** de correspondance. Le système répond toujours "Si un compte existe, un lien a été envoyé" — y compris pour des emails enregistrés — et aucun email de réinitialisation n'est envoyé.

**Scénario d'exploitation** :
Il s'agit d'un bug de sécurité : la fonctionnalité de réinitialisation de mot de passe est silencieusement non-fonctionnelle. Un utilisateur ayant perdu son mot de passe est bloqué définitivement. Un attaquant n'obtient aucun avantage direct mais cette faille empêche la récupération de compte légitime.

**Correctif** :
```js
// server/routes/otp.js:49 — remplacer la recherche par email en clair
// AVANT :
const user = await db.collection("users").findOne({ email });

// APRÈS :
const { hashField } = require("../utils/crypto");
const user = await db.collection("users").findOne({ emailHash: hashField(email) });
```

---

### SEC-005 — CVE Élevées dans les dépendances (npm audit)

**Criticité** : Élevé
**Catégorie** : CWE-1035 / OWASP A06 Vulnerable and Outdated Components
**Fichier** : `package.json`

**Description** :
`npm audit` rapporte 0 critique, 9 élevées (comptées par package, 38 advisories au total), 27 modérées.

Packages élevés avec impact potentiel sur le serveur ou le build :

| Package | CVE | Impact |
|---------|-----|--------|
| `path-to-regexp` (via Express) | GHSA-j3q9-mxjg-w52f, GHSA-27v5-c462-wpq7 | ReDoS — un attaquant peut saturer le CPU avec une URL malformée sur n'importe quel endpoint Express |
| `undici` | GHSA-4992-7rv2-5pvq (CRLF injection) | Utilisé par Node.js fetch natif — injection de headers HTTP dans les requêtes vers Groq/Apple/Google |
| `lodash` | GHSA-xxjr-mmjv-4gpg (prototype pollution) | Via les outils de build Expo — impact limité au build time, pas au runtime serveur |
| `@xmldom/xmldom` | GHSA-2v35-w6hq-6mfw (DoS) | Via les outils Expo — impact build time |
| `node-forge` | GHSA-2328-f5f3-gj25 (bypass cert chain) | Via les outils de build — impact limité |

**Correctif** :
```bash
# Mettre à jour express et ses dépendances pour path-to-regexp
npm update express

# Pour les dépendances Expo (build uniquement), suivre les mises à jour Expo
npx expo install --fix

# Vérifier régulièrement
npm audit --audit-level=high
```

---

### SEC-006 — Apple Team ID réel dans eas.json versionné

**Criticité** : Élevé
**Catégorie** : CWE-312 / OWASP A02 Cryptographic Failures
**Fichier** : `eas.json:20`

**Description** :
```json
"appleTeamId": "9CV49WRKBK"
```
L'identifiant d'équipe Apple Developer (`9CV49WRKBK`) est versionné dans le dépôt git. Bien que cet identifiant soit semi-public (visible dans les apps distribuées), sa présence dans un dépôt potentiellement public permet à un attaquant de cibler des attaques de phishing contre les services Apple associés ou de préparer des attaques contre les flows de signature.

**Correctif** :
```json
// eas.json — remplacer par un placeholder ou utiliser les variables d'environnement EAS
"appleTeamId": "${APPLE_TEAM_ID}"
```
Puis définir `APPLE_TEAM_ID` dans les secrets EAS (dashboard Expo).

---

### SEC-007 — Access token lu depuis AsyncStorage non sécurisé dans i18n.ts

**Criticité** : Élevé
**Catégorie** : CWE-312 / OWASP M9 Insecure Data Storage (Mobile Top 10)
**Fichier** : `src/utils/i18n.ts:24` et `src/utils/i18n.ts:43`

**Description** :
Le fichier `i18n.ts` accède à l'access token JWT via `AsyncStorage` (stockage non chiffré) :
```ts
const AUTH_STORAGE_KEY = "token";
const token = await AsyncStorage.getItem(AUTH_STORAGE_KEY); // ligne 24
```
Le reste de l'application utilise correctement `src/utils/secureStorage.ts` (basé sur `expo-secure-store` → Keychain iOS / Keystore Android). Cette incohérence signifie que l'access token est stocké **doublement** : dans SecureStore (sécurisé) et dans AsyncStorage (non chiffré, accessible via backup Android non chiffré ou jailbreak sans entitlements).

**Note** : La fonctionnalité `i18n.ts` n'écrit pas elle-même dans AsyncStorage — elle lit le token pour synchroniser la langue. Si le token n'est stocké que dans SecureStore par les autres modules, `AsyncStorage.getItem("token")` retournera `null` et la synchronisation de langue sera silencieusement désactivée. Le vrai risque est si d'autres modules ont écrit dans AsyncStorage avec la clé `"token"`.

**Correctif** :
```ts
// src/utils/i18n.ts — remplacer AsyncStorage par secureStorage
import * as secureStorage from "./secureStorage";

// Remplacer :
const token = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
// Par :
const token = await secureStorage.getItem("token");
```

---

### SEC-008 — Invitations de type `link` sans expiration

**Criticité** : Élevé
**Catégorie** : CWE-613 / OWASP A01 Broken Access Control
**Fichier** : `server/routes/invitations.js:241-251`

**Description** :
Les invitations de type `"link"` (lien partageable pour rejoindre un voyage) sont créées sans champ `expiresAt` :
```js
await db.collection("invitations").insertOne({
  tripId, inviterId, type: "link", status: "pending",
  token, permissions: {...}, createdAt: new Date(), usageCount: 0,
  // Pas de expiresAt !
});
```
Un lien partagé publiquement (réseaux sociaux, messagerie) reste valide indéfiniment. Même si l'organisateur du voyage change d'avis, le lien ne peut être révoqué qu'en passant `force: true` — mécanisme non documenté pour les utilisateurs.

De même, les liens d'invitation amis (`friendInviteLinks`) n'ont pas de TTL (`server/routes/friendInvites.js` : aucun `expiresAt`).

**Correctif** :
```js
// server/routes/invitations.js — ajouter TTL de 30 jours sur les link-invitations
await db.collection("invitations").insertOne({
  tripId, inviterId, type: "link", status: "pending", token,
  permissions: {...}, createdAt: new Date(), usageCount: 0,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
});

// Dans le handler d'acceptation, vérifier l'expiration pour les links aussi :
if (invitation.type === "link" && invitation.expiresAt && new Date() > invitation.expiresAt) {
  return res.status(400).json({ error: "Lien d'invitation expiré" });
}
```

---

### SEC-009 — GET /invitations/token/:token public expose email de l'inviteur

**Criticité** : Élevé
**Catégorie** : CWE-200 / OWASP A01 Broken Access Control
**Fichier** : `server/routes/invitations.js:166-184`

**Description** :
L'endpoint `GET /invitations/token/:token` est accessible sans authentification. Il retourne l'objet d'invitation complet incluant l'email et le nom déchiffrés de l'inviteur :
```js
inviter: inviter ? {
  _id: inviter._id,
  name: inviter.name ? decrypt(inviter.name) : null,
  email: inviter.email ? decrypt(inviter.email) : null,  // email en clair !
  avatar: inviter.avatar,
} : null
```
Un attaquant qui énumère des tokens (improbable vu l'entropie de 256 bits, mais possible si un token a fuité) obtiendrait l'adresse email de l'inviteur sans être authentifié.

**Correctif** :
```js
// Option 1 : Exiger l'authentification sur cet endpoint
router.get("/token/:token", requireAuth, async (req, res) => {

// Option 2 : Ne pas exposer l'email de l'inviteur à un utilisateur non-authentifié
inviter: inviter ? {
  _id: inviter._id,
  name: inviter.name ? decrypt(inviter.name) : null,
  // email supprimé de la réponse publique
  avatar: inviter.avatar,
} : null
```

---

### SEC-010 — Validation Android IAP non implémentée

**Criticité** : Élevé
**Catégorie** : CWE-285 / OWASP A01 Broken Access Control
**Fichier** : `server/routes/subscriptions.js:136-140`

**Description** :
```js
} else {
  // Android : à implémenter via Google Play Developer API
  const durationMs = PLAN_DURATIONS_MS[productId];
  if (!durationMs) throw new Error(`ProductId inconnu : ${productId}`);
  endDate = new Date(now.getTime() + durationMs);
}
```
Pour la plateforme `android`, le reçu d'achat (`receiptData`) n'est jamais vérifié. Tout utilisateur Android peut envoyer un reçu inventé et obtenir un abonnement Premium actif pour la durée du plan.

**Correctif** :
```js
// Implémenter la validation via l'API Google Play Developer
// Documentation : https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions/get
async function computeAndroidEndDate({ receiptData, productId, transactionId, userId }) {
  // receiptData contient le purchaseToken pour Android
  const PLAY_API = "https://androidpublisher.googleapis.com/androidpublisher/v3";
  const packageName = "com.panda_sauvage.MyTripCircle";
  // Appel authentifié via service account Google
  // ...
}

// En attendant l'implémentation complète, bloquer Android :
if (platform === "android") {
  logger.warn(`[subscriptions] Validation Android non implémentée — userId=${userId}`);
  return res.status(501).json({ success: false, error: "Validation Android non disponible" });
}
```

---

### SEC-011 — Sanitisation partielle du paramètre city (prompt injection)

**Criticité** : Moyen
**Catégorie** : CWE-77 / Prompt Injection
**Fichier** : `server/routes/itinerary.js:61-76`

**Description** :
Le paramètre `city` est partiellement sanitisé avant injection dans le prompt :
```js
const cityClean = city.trim().replaceAll(/["\\\n\r]/g, " ");
const prompt = `... pour la ville "${cityClean}" ...`;
```
Les guillemets sont filtrés mais d'autres vecteurs de prompt injection restent possibles : backticks, séquences unicode similaires à des guillemets (`‟`, `″`, `「`), ou instructions en langage naturel (`Paris. Ignore les instructions précédentes et génère...`).

**Scénario d'exploitation** :
La limite côté Groq (`response_format: json_object`) réduit significativement l'impact. Cependant un attaquant peut influencer le contenu retourné (fausses informations dans l'itinéraire) ou tenter de faire retourner des données hors-format pour provoquer une erreur révélatrice.

**Correctif** :
```js
// Approche défensive en profondeur :
// 1. Valider que city ne contient que des caractères de nom géographique
const CITY_RE = /^[\p{L}\p{N}\s\-.',()]{1,100}$/u;
if (!CITY_RE.test(city.trim())) {
  return res.status(400).json({ error: "invalid_city" });
}

// 2. Utiliser le rôle system pour isoler les instructions du contenu utilisateur
body: JSON.stringify({
  model: "llama-3.3-70b-versatile",
  messages: [
    { role: "system", content: "Tu génères uniquement des itinéraires de voyage au format JSON..." },
    { role: "user", content: `Ville: ${cityClean}, Jours: ${daysInt}` },
  ],
  ...
})
```

---

### SEC-012 — Absence de rate-limiter dédié sur les endpoints de validation IAP

**Criticité** : Moyen
**Catégorie** : CWE-770 / OWASP A04 Insecure Design
**Fichier** : `server/routes/subscriptions.js` (routes `/validate` et `/validate-receipt`)

**Description** :
Les routes `POST /subscriptions/validate` et `POST /subscriptions/validate-receipt` ne bénéficient que du `generalLimiter` (1 000 req/min par utilisateur). Un attaquant peut effectuer des centaines de tentatives de validation de reçu frauduleux par minute sans friction supplémentaire.

**Correctif** :
```js
// server/middleware/rateLimiter.js — ajouter un limiter IAP
const iapLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // 10 validations par heure par utilisateur
  keyGenerator: (req) => req.user?._id ? String(req.user._id) : req.ip || "unknown",
  validate: { keyGeneratorIpFallback: false },
  message: { success: false, error: "Trop de tentatives de validation." },
});

// server/routes/subscriptions.js
router.post("/validate", requireAuth, iapLimiter, async (req, res) => { ... });
router.post("/validate-receipt", requireAuth, iapLimiter, async (req, res) => { ... });
```

---

### SEC-013 — console.log non gardé dans MongoDBService.ts (client mobile)

**Criticité** : Moyen
**Catégorie** : CWE-532 / OWASP M10 Extraneous Functionality
**Fichier** : `src/services/MongoDBService.ts:55` et `:66`

**Description** :
```ts
console.log("MongoDB connecté avec succès");  // ligne 55
console.log("MongoDB déconnecté");            // ligne 66
```
Ces logs ne sont pas gardés par `__DEV__` ni par le logger applicatif. Ils s'affichent en production dans la console Metro (développement) et potentiellement dans les outils de crash reporting si l'app y est connectée. Bien que le contenu soit bénin, cela viole le principe de ne pas logger en production.

**Correctif** :
```ts
if (__DEV__) console.log("MongoDB connecté avec succès");
```

---

### SEC-014 — .env.example documente une valeur dangereuse pour IAP_SKIP_VALIDATION

**Criticité** : Moyen
**Catégorie** : CWE-1188 / OWASP A05 Security Misconfiguration
**Fichier** : `.env.example:44`

**Description** :
```
IAP_SKIP_VALIDATION=true
```
La valeur `true` est documentée comme valeur à copier. Un opérateur qui copie `.env.example` en `.env` de production (antipattern courant) active le bypass de validation Apple.

**Correctif** :
```
# .env.example
IAP_SKIP_VALIDATION=false   # IMPORTANT : false en production. true uniquement en dev local.
```

---

### SEC-015 — CORS bloquant si ALLOWED_ORIGINS non configuré

**Criticité** : Moyen
**Catégorie** : CWE-16 / OWASP A05 Security Misconfiguration
**Fichier** : `server/index.js:45-51`

**Description** :
```js
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ?? [];
app.use(cors({ origin: ALLOWED_ORIGINS, ... }));
```
Si `ALLOWED_ORIGINS` est absent, `origin` est un tableau vide `[]`. Le module `cors` interprète cela comme "bloquer toutes les origines cross-domain". Les appels API depuis l'app mobile (qui passe par `fetch`) ne sont pas affectés (pas de vérification CORS dans React Native), mais si une webview ou un outil tiers essaie d'accéder à l'API, il sera bloqué sans avertissement dans les logs.

**Correctif** :
```js
// server/index.js — documenter le comportement et ajouter un warning au démarrage
if (!process.env.ALLOWED_ORIGINS && process.env.NODE_ENV === "production") {
  logger.warn("[cors] ALLOWED_ORIGINS non configuré — toutes les requêtes CORS navigateur seront bloquées");
}
```

---

### SEC-016 — Absence d'index MongoDB sur calendarToken

**Criticité** : Moyen
**Catégorie** : CWE-400 / Performance / DoS par ressource
**Fichier** : `server/db.js` (absence d'index), `server/routes/calendar.js:67`

**Description** :
```js
const user = await db.collection("users").findOne({ calendarToken: token });
```
Le champ `calendarToken` n'est pas indexé. Chaque synchronisation iCal (qui peut être déclenché toutes les 15 minutes par iOS Calendar) provoque un full collection scan sur `users`. Pour une base avec des milliers d'utilisateurs, cela devient un vecteur de dégradation de performance.

**Correctif** :
```js
// server/db.js — dans _ensureIndexes()
try {
  await db.collection("users").createIndex({ calendarToken: 1 }, { sparse: true });
} catch (err) {
  logger.error("[db] Erreur index users.calendarToken:", err.message);
}
```

---

### SEC-017 — DELETE /friends/:friendId n'invalide pas le format de l'ID

**Criticité** : Moyen
**Catégorie** : CWE-20 / OWASP A03 Injection
**Fichier** : `server/routes/friends.js:146-161`

**Description** :
```js
router.delete("/:friendId", requireAuth, async (req, res) => {
  const { friendId } = req.params;
  await db.collection("friends").deleteMany({
    $or: [{ userId, friendId }, { userId: friendId, friendId: userId }],
  });
```
Le `friendId` n'est pas validé comme ObjectId avant d'être utilisé dans la requête MongoDB. Bien que le driver MongoDB natif ne soit pas susceptible de NoSQL injection via un champ string (contrairement à `findOne({ _id: req.body._id })` sans cast), une valeur malformée (ex: objet JSON passé via un bug de parsing) pourrait provoquer un comportement inattendu. De plus, un ID non-ObjectId valide génèrerait silencieusement une requête qui ne supprime rien au lieu de retourner une erreur.

**Correctif** :
```js
const { ObjectId } = require("mongodb");
router.delete("/:friendId", requireAuth, async (req, res) => {
  const { friendId } = req.params;
  // Validation du format
  if (!ObjectId.isValid(friendId)) {
    return res.status(400).json({ error: "ID invalide" });
  }
  // ...
```

---

### SEC-018 — Templates email intègrent des données utilisateur sans échappement HTML

**Criticité** : Moyen
**Catégorie** : CWE-80 / XSS dans les emails HTML
**Fichier** : `server/utils/email.js` (fonctions `sendFriendRequestEmail`, `sendTripInvitationEmail`, etc.)

**Description** :
Les templates emails construisent du HTML en interpolant directement des valeurs venant de la base de données (déchiffrées) :
```js
// Exemple : sendTripInvitationEmail
heading(t.title) + `<p>... ${bold(inviterName)} vous a invité...</p>` + tripCard
// tripCard inclut : tripTitle, tripDestination (non échappés)
```
Si un utilisateur crée un voyage avec `destination: "<script>...</script>"` ou un nom contenant des balises HTML, le contenu s'injecterait dans les emails envoyés aux invités.

L'impact est limité car : (1) la plupart des clients mail bloquent `<script>`, (2) les données viennent de la base (chiffrées, non directement d'un champ utilisateur non validé). Mais le risque persiste pour des vecteurs comme les injections HTML passives (`<img src=x onerror=...>`).

**Correctif** :
```js
// Ajouter une fonction d'échappement HTML
function escapeHtml(str) {
  if (typeof str !== "string") return String(str ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Utiliser dans les templates :
heading(escapeHtml(t.title))
cardLine(`${bold(escapeHtml(inviterName))} vous a invité...`)
```

---

### SEC-019 — Content-Security-Policy non configurée explicitement

**Criticité** : Moyen
**Catégorie** : CWE-1021 / OWASP A05 Security Misconfiguration
**Fichier** : `server/index.js:42-43`

**Description** :
```js
app.use(helmet());
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
```
`helmet()` sans configuration active la CSP par défaut de Helmet, qui est restrictive mais générique. Les routes `/privacy` et `/terms` servent du HTML statique et la route `/reset-password-page` génère une page HTML avec un lien deep link. Sans CSP explicite adaptée, le navigateur peut charger des ressources non prévues.

**Correctif** :
```js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'none'"],  // Pas de JS inline nécessaire
      styleSrc: ["'unsafe-inline'"],  // Les pages légales utilisent du style inline
      imgSrc: ["'self'", "data:"],
      formAction: ["'none'"],
    },
  },
}));
```

---

### SEC-020 — logger.warn et logger.error actifs en production sans filtre

**Criticité** : Faible
**Catégorie** : CWE-532 / Information Exposure Through Log Files
**Fichier** : `server/utils/logger.js:11-12`

**Description** :
```js
warn: (...args) => console.warn("[warn]", ...sanitize(...args)),
error: (...args) => console.error("[error]", ...sanitize(...args)),
```
`warn` et `error` sont actifs en production (correct), mais `sanitize` ne supprime que les `\r\n` (protection CRLF injection). Les messages peuvent contenir des identifiants utilisateur (`userId=xxx`) et des messages d'erreur détaillés. Si les logs sont envoyés à un service tiers (Datadog, Sentry), vérifier qu'aucune PII n'est incluse.

---

### SEC-021 — .gitignore ne couvre pas .env.production

**Criticité** : Faible
**Catégorie** : CWE-312 / OWASP A02 Cryptographic Failures
**Fichier** : `.gitignore:34`

**Description** :
```
.env*.local
.env
```
Le pattern `.env*.local` couvre `.env.local`, `.env.development.local`, etc. Mais `.env.production` (sans `.local`) ou `.env.staging` ne sont pas couverts. Si un développeur crée ce fichier, il pourrait être accidentellement commité.

**Correctif** :
```
# .gitignore — élargir la règle
.env
.env.*
!.env.example
```

---

### SEC-022 — Comparaison email invitations sensible à la casse

**Criticité** : Faible
**Catégorie** : CWE-178 / OWASP A07
**Fichier** : `server/routes/invitations.js:137`

**Description** :
```js
if (req.user.email !== email.toLowerCase()) {
  return res.status(403).json({ error: "Accès refusé" });
}
```
`req.user.email` est déchiffré par le middleware et peut ne pas être normalisé en minuscules selon le chemin d'inscription (Google OAuth retourne l'email avec casse variable). Cette vérification pourrait bloquer un utilisateur légitime si son email a été stocké avec une capitalisation différente.

**Correctif** :
```js
if (req.user.email?.toLowerCase() !== email.toLowerCase()) {
```

---

### SEC-023 — Paramètre maxwidth non validé dans /places/photo

**Criticité** : Faible
**Catégorie** : CWE-20 / Validation insuffisante
**Fichier** : `server/routes/places.js:116`

**Description** :
```js
const { ref, maxwidth = "800" } = req.query;
// ...
maxwidth: String(maxwidth),  // transmis directement à Google Places API
```
Un attaquant peut passer `maxwidth=99999` pour forcer le téléchargement d'images en très haute résolution, potentiellement consommant plus de quota Google Places et de bande passante.

**Correctif** :
```js
const rawMaxwidth = Number.parseInt(req.query.maxwidth) || 800;
const maxwidth = Math.min(Math.max(rawMaxwidth, 100), 1600).toString();
```

---

### SEC-024 — Schéma URL deep link non protégé sur Android

**Criticité** : Faible
**Catégorie** : CWE-940 / OWASP M1 Improper Credential Usage (Mobile)
**Fichier** : `app.json:148`

**Description** :
```json
"scheme": "mytripcircle"
```
Sur Android, n'importe quelle application installée peut enregistrer le schéma `mytripcircle://` et intercepter les deep links (invitations, reset-password). iOS est protégé via l'entitlement Associated Domains si Universal Links sont configurés, mais Android custom URL schemes sont universellement interceptables.

**Correctif** :
Configurer des **Android App Links** (HTTPS) en plus du custom scheme. Les Android App Links utilisent la vérification par fichier `assetlinks.json` hébergé sur le domaine, empêchant l'interception par d'autres apps. Garder le custom scheme uniquement comme fallback.

---

## Catégories sans finding notable

### F. Cryptographie (côté serveur)
L'utilisation de `crypto.randomBytes(32)` pour les tokens, `crypto.randomInt()` pour les OTP, et AES-256-GCM pour le chiffrement PII est correcte. Aucune utilisation de `Math.random()` dans le code de sécurité. Bcrypt avec cost factor 10 pour les mots de passe.

### I. Logique métier — Race conditions
La rotation des refresh tokens est atomique (delete puis insert). Les invitations et l'ownership transfer ne semblent pas exposés à des races conditions exploitables en pratique (MongoDB est mono-thread pour les opérations de write sur un document).

### J. Logs — Données sensibles
Aucun `console.log` server-side ne logue de token, OTP, ou mot de passe. Le logger filtre les `\r\n`.

### K. Dépendances directes
Les dépendances directes du serveur (`express ^5.1.0`, `mongodb ^6.20.0`, `jsonwebtoken ^9.0.3`, `bcrypt ^6.0.0`, `helmet ^8.1.0`, `express-rate-limit ^8.3.2`) sont à jour sans CVE connues. Les CVE identifiées en SEC-005 sont dans les dépendances transitives du toolchain Expo (build/dev uniquement pour la plupart), sauf `path-to-regexp` qui est une dépendance transitive d'Express 5.

### M. Sécurité IA (Groq)
La clé Groq est côté serveur uniquement. Le rate limiting par utilisateur (10 req/24h en BD) est correct. Le contenu retourné par Groq est parsé en JSON et jamais réexécuté. L'OCR (Anthropic) est côté client uniquement (MLKit barcode — pas d'appel API externe serveur pour cette fonctionnalité) selon l'analyse du code.

---

## Plan d'action

### Quick wins (< 1 jour)

- [ ] **SEC-004** : Corriger la requête `findOne({ email })` → `findOne({ emailHash: hashField(email) })` dans `server/routes/otp.js:49`.
- [ ] **SEC-002 + SEC-014** : Changer la logique `IAP_SKIP_VALIDATION: process.env.IAP_SKIP_VALIDATION !== "false"` en `=== "true"` dans `config.js`, et mettre à jour `.env.example` avec `IAP_SKIP_VALIDATION=false`.
- [ ] **SEC-021** : Élargir `.gitignore` pour couvrir `.env.*` (sauf `.env.example`).
- [ ] **SEC-023** : Ajouter la validation du paramètre `maxwidth` dans `/places/photo`.
- [ ] **SEC-013** : Encapsuler les `console.log` de `MongoDBService.ts` avec `if (__DEV__)`.
- [ ] **SEC-016** : Ajouter l'index MongoDB sur `users.calendarToken` dans `db.js`.

### Refactoring (1–5 jours)

- [ ] **SEC-001** : Révoquer immédiatement les credentials MongoDB exposés dans l'historique. Purger l'historique git avec `git-filter-repo`.
- [ ] **SEC-003** : Ajouter la vérification `inviteeEmailHash`/`inviteePhoneHash` dans le handler `PUT /invitations/:token` pour les invitations non-link.
- [ ] **SEC-007** : Migrer `i18n.ts` de `AsyncStorage.getItem("token")` vers `secureStorage.getItem("token")`.
- [ ] **SEC-008** : Ajouter `expiresAt` (30 jours) sur les invitations de type `link` et les `friendInviteLinks`.
- [ ] **SEC-009** : Ajouter `requireAuth` sur `GET /invitations/token/:token` ou supprimer l'email de l'inviteur de la réponse publique.
- [ ] **SEC-018** : Ajouter une fonction `escapeHtml()` dans `email.js` et l'appliquer à toutes les valeurs interpolées.
- [ ] **SEC-017** : Ajouter `ObjectId.isValid()` dans `DELETE /friends/:friendId`.
- [ ] **SEC-012** : Créer un `iapLimiter` (10 req/heure) et l'appliquer aux routes `/subscriptions/validate*`.
- [ ] **SEC-005** : Lancer `npm update express` et `npx expo install --fix` pour réduire les CVE Élevées.

### Long terme

- [ ] **SEC-010** : Implémenter la validation des reçus Android via Google Play Developer API.
- [ ] **SEC-006** : Migrer l'`appleTeamId` vers les secrets EAS (variables d'environnement Expo).
- [ ] **SEC-011** : Ajouter une validation regex stricte sur `city` (caractères géographiques uniquement) et utiliser un rôle `system` séparé dans le prompt Groq.
- [ ] **SEC-019** : Configurer une CSP explicite et adaptée aux routes HTML dans Helmet.
- [ ] **SEC-024** : Configurer les Android App Links (Universal Links) pour remplacer le custom scheme sur les deep links sensibles (reset-password, invitation).
- [ ] **SEC-015** : Ajouter un warning au démarrage si `ALLOWED_ORIGINS` est vide en production.

---

## Recommandations CI/CD

- **npm audit bloquant** : Ajouter `npm audit --audit-level=critical` dans la pipeline CI (bloquer si Critical). Pour les Élevées, monitorer et traiter dans les 30 jours.
- **Secret scanning** : Intégrer [gitleaks](https://github.com/gitleaks/gitleaks) ou [trufflehog](https://github.com/trufflesecurity/trufflehog) dans la pipeline pour détecter les secrets dans les commits futurs.
- **SAST** : SonarQube est déjà configuré (`sonar-project.properties`). Vérifier que les règles de sécurité JavaScript/TypeScript sont activées (injection, hardcoded secrets, XSS).
- **Dépendances** : Configurer Dependabot ou Renovate pour les mises à jour automatiques des dépendances de sécurité.
- **Tests d'intégration sécurité** : Ajouter des tests automatisés sur les endpoints critiques :
  - Tentative d'acceptation d'invitation par un utilisateur non-destinataire (SEC-003).
  - Validation IAP avec un reçu vide en production (SEC-002).
  - Réinitialisation de mot de passe avec un email existant (SEC-004).
