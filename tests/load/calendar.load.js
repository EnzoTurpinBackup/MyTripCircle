import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

// ──────────────────────────────────────────────────────────────────────────────
// Test de charge — flux sortant GET /calendar/:token du backend Express
// MyTripCircle (server/routes/calendar.js).
//
// Pourquoi cette route ? C'est le flux de données sortant du système :
// l'application expose les réservations d'un utilisateur au format iCalendar
// (RFC 5545) pour que les agendas natifs iOS/Android s'y abonnent. Contrairement
// à /health, la route fait un vrai travail : trois lectures Mongo (users,
// subscriptions, trips, bookings) puis une sérialisation iCal complète. La
// charge y est donc proportionnelle au nombre de réservations de l'utilisateur.
//
// Contrat réel de la route (lu dans server/routes/calendar.js) :
//   • le jeton doit satisfaire /^[0-9a-f]{64}$/ — sinon 404, sans requête Mongo ;
//   • jeton inconnu en base → 404 ;
//   • abonnement non actif (ou expiré) → 403 ;
//   • succès → 200, Content-Type "text/calendar; charset=utf-8", corps iCal ;
//   • calendarLimiter : 30 requêtes / minute / IP, au-delà → 429.
//
// Ce que le scénario mesure — ce sont les indicateurs qui rendent le flux
// « mesurable » au sens du référentiel :
//   • le temps de réponse (p95) du flux, via calendar_duration ;
//   • le taux d'échec (http_req_failed), 429 suivis à part ;
//   • le POIDS du flux transmis en octets, via calendar_payload_bytes ;
//   • le NOMBRE D'ÉVÉNEMENTS VEVENT produits par réponse, via
//     calendar_vevent_count (comptage des occurrences de "BEGIN:VEVENT").
//   Les deux dernières métriques caractérisent le volume de données réellement
//   échangé entre les deux logiciels, pas seulement la latence du transport.
//
// ⚠️ Limiteur de débit — choix de calibrage assumé :
//   calendarLimiter autorise 30 requêtes/minute/IP. Un scénario k6 lancé depuis
//   une seule machine partage donc UNE seule fenêtre de 30 req/min : au-delà,
//   on ne mesurerait plus le flux mais la protection anti-abus.
//   Le scénario par défaut est calibré SOUS la limite :
//     VUS (1) × 1 requête / SLEEP (2,5 s) ≈ 24 req/min < 30 → marge de sécurité.
//   Ce calibrage reflète l'usage réel : un agenda ne resynchronise pas plus de
//   quelques fois par heure, la route n'est pas un point chaud de trafic.
//   Pour mesurer VOLONTAIREMENT le déclenchement du limiteur (comportement
//   attendu, et lui aussi mesurable), lancer avec :
//     -e VUS=5 -e SLEEP=1        (≈ 300 req/min → 429 attendus)
//   Les 429 sont alors comptés dans calendar_429_rate_limited, et la latence
//   calendar_duration reste calculée sur les seules réponses 200 : le seuil de
//   performance reste donc valide. En revanche le seuil http_req_failed est,
//   lui, volontairement dépassé (les 429 ne sont pas des 2xx), et k6 sort en
//   code 99 : c'est le résultat attendu de ce profil, pas un défaut du serveur.
//
// Jeton : fourni au runtime via -e CALENDAR_TOKEN=... AUCUN jeton n'est écrit
// en dur (cf. CLAUDE.md — pas de secret dans le code). Il s'obtient sur un
// compte premium via POST /users/calendar/token (server/routes/users.js).
//   k6 run -e CALENDAR_TOKEN=<64 caractères hexadécimaux> tests/load/calendar.load.js
// En son absence, setup() échoue immédiatement (fail fast) plutôt que de
// produire une campagne de 404 qui ne mesurerait rien du flux.
//
// Résultats de la campagne du 18/08/2026 (sortie k6 brute, environnement de
// mesure et jeu de données) : tests/load/resultats-charge-2026-08-18.txt
// ──────────────────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";
const VUS = Number.parseInt(__ENV.VUS || "1", 10);
const SLEEP = Number.parseFloat(__ENV.SLEEP || "2.5");
const CALENDAR_TOKEN = __ENV.CALENDAR_TOKEN;

// Format imposé par la route : 64 caractères hexadécimaux minuscules.
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

// Latence du flux, isolée de celle de la requête de contrôle faite dans setup().
const calendarDuration = new Trend("calendar_duration", true);
// Poids du flux iCal renvoyé, en octets : c'est le volume de données échangé.
const payloadBytes = new Trend("calendar_payload_bytes");
// Nombre d'événements VEVENT par réponse : c'est le contenu métier du flux.
const veventCount = new Trend("calendar_vevent_count");

// Compteurs dédiés, pour distinguer les réponses attendues des vraies erreurs.
const rateLimited = new Counter("calendar_429_rate_limited");
const notFound = new Counter("calendar_404_unknown_token");
const forbidden = new Counter("calendar_403_not_premium");

export const options = {
  stages: [
    { duration: "30s", target: VUS }, // montée
    { duration: "1m", target: VUS },  // palier
    { duration: "20s", target: 0 },   // descente
  ],
  thresholds: {
    // Le flux fait plusieurs lectures Mongo puis sérialise l'iCal : seuil plus
    // large que /health (500 ms), plus serré que /login (bcrypt, 800 ms).
    "calendar_duration": ["p(95)<700"],
    // Moins de 1 % d'échecs réseau/serveur (429/404/403 suivis à part).
    "http_req_failed": ["rate<0.01"],
    // Le flux doit rester non vide : un iCal valide contient au minimum
    // l'en-tête VCALENDAR, soit largement plus de 50 octets.
    "calendar_payload_bytes": ["min>50"],
  },
};

// Seuls 2xx/3xx comptent comme succès pour http_req_failed ; les 429, 404 et
// 403 sont suivis via leurs compteurs dédiés.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }));

function countVevents(body) {
  if (typeof body !== "string") return 0;
  // Comptage littéral des balises d'ouverture d'événement du format iCalendar.
  const matches = body.match(/BEGIN:VEVENT/g);
  return matches ? matches.length : 0;
}

// setup() s'exécute une fois avant la charge : on vérifie que le jeton est
// fourni ET exploitable, pour échouer vite plutôt que de mesurer des 404.
export function setup() {
  if (!CALENDAR_TOKEN) {
    throw new Error(
      "Jeton manquant. Lance avec : -e CALENDAR_TOKEN=<64 caractères hexadécimaux>. " +
      "Le jeton s'obtient via POST /users/calendar/token sur un compte premium."
    );
  }
  if (!TOKEN_PATTERN.test(CALENDAR_TOKEN)) {
    throw new Error(
      "Jeton invalide : la route exige exactement 64 caractères hexadécimaux " +
      "minuscules (/^[0-9a-f]{64}$/). Toute autre valeur renvoie 404."
    );
  }

  // Requête de contrôle : on refuse de lancer une campagne qui mesurerait un
  // 404 (jeton inconnu) ou un 403 (abonnement inactif) plutôt que le flux.
  const probe = http.get(`${BASE_URL}/calendar/${CALENDAR_TOKEN}`);
  if (probe.status === 404) {
    throw new Error("Jeton inconnu côté serveur (404) : aucun flux à mesurer.");
  }
  if (probe.status === 403) {
    throw new Error(
      "Abonnement non actif (403) : la route réserve le flux iCal aux abonnés premium."
    );
  }
  if (probe.status !== 200) {
    throw new Error(
      `Flux indisponible (status ${probe.status}) — campagne annulée.`
    );
  }

  return { events: countVevents(probe.body), bytes: probe.body.length };
}

export default function () {
  const res = http.get(`${BASE_URL}/calendar/${CALENDAR_TOKEN}`);

  if (res.status === 429) {
    rateLimited.add(1);
  } else if (res.status === 404) {
    notFound.add(1);
  } else if (res.status === 403) {
    forbidden.add(1);
  }

  if (res.status === 200 && typeof res.body === "string") {
    calendarDuration.add(res.timings.duration);
    payloadBytes.add(res.body.length);
    veventCount.add(countVevents(res.body));
  }

  check(res, {
    // En cas d'échec réseau (host injoignable), r.body vaut undefined :
    // on garde les checks défensifs pour ne pas planter le VU.
    "status est 200": (r) => r.status === 200,
    "content-type text/calendar": (r) =>
      String(r.headers["Content-Type"] || "").includes("text/calendar"),
    "flux iCal bien formé": (r) =>
      typeof r.body === "string" &&
      r.body.startsWith("BEGIN:VCALENDAR") &&
      r.body.trimEnd().endsWith("END:VCALENDAR"),
    "réponse < 700ms": (r) => r.timings.duration < 700,
  });

  // Cadence par défaut de 2,5 s : maintient le débit sous les 30 req/min du
  // limiteur tout en restant représentatif d'une synchronisation d'agenda.
  sleep(SLEEP);
}
