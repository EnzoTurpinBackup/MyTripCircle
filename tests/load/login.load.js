import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

// ──────────────────────────────────────────────────────────────────────────────
// Test de charge — endpoint POST /users/login du backend Express MyTripCircle.
//
// Pourquoi /login ? C'est un POST public qui effectue un vrai travail serveur :
// lecture Mongo (users) + comparaison bcrypt du mot de passe (CPU-intensif).
// C'est donc un bon indicateur de la tenue en charge d'un chemin métier réel,
// contrairement à /health qui ne touche pas la base.
//
// Identifiants : fournis au runtime via -e EMAIL=... -e PASSWORD=...
// AUCUN identifiant n'est écrit en dur (cf. CLAUDE.md — pas de secret hardcodé).
//   k6 run -e EMAIL=test@exemple.com -e PASSWORD=motdepasse tests/load/login.load.js
//
// ⚠️ Effets de bord & limites à connaître :
//   • Chaque login réussi écrit un refresh token en base (createRefreshToken).
//     Sur un gros run cela crée de nombreux tokens → à purger / cleanup job.
//   • authLimiter s'applique à /login MAIS avec skipSuccessfulRequests : les
//     succès (200) ne comptent pas. Seuls les échecs (401) sont limités (5/15min).
//   • generalLimiter (1000 req/min/IP) s'applique quand même : on garde une
//     charge modérée (10 VUs) pour mesurer la perf, pas pour saturer la limite.
//   • bcrypt étant coûteux en CPU, la latence est naturellement plus haute que
//     sur /health — c'est le but : observer le comportement sous charge réelle.
// ──────────────────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";
const VUS = Number.parseInt(__ENV.VUS || "10", 10);
const EMAIL = __ENV.EMAIL;
const PASSWORD = __ENV.PASSWORD;

// Compteurs dédiés pour distinguer les types de réponses dans le rapport.
const unauthorized = new Counter("login_401_unauthorized");
const rateLimited = new Counter("login_429_rate_limited");

export const options = {
  stages: [
    { duration: "30s", target: VUS }, // montée
    { duration: "1m", target: VUS },  // palier
    { duration: "20s", target: 0 },   // descente
  ],
  thresholds: {
    // bcrypt est plus lent que /health : seuil élargi à 800 ms sur le p95.
    "http_req_duration": ["p(95)<800"],
    // Moins de 1 % d'échecs (2xx/3xx attendus ; 401 et 429 suivis à part).
    "http_req_failed": ["rate<0.01"],
  },
};

// Seuls 2xx/3xx comptent comme succès pour http_req_failed ; les 401/429
// sont suivis via leurs compteurs dédiés.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }));

// setup() s'exécute une fois avant la charge : on vérifie que les identifiants
// sont fournis, pour échouer vite (fail fast) plutôt que d'envoyer 100% d'erreurs.
export function setup() {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "Identifiants manquants. Lance avec : -e EMAIL=... -e PASSWORD=..."
    );
  }
}

export default function () {
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const params = { headers: { "Content-Type": "application/json" } };

  const res = http.post(`${BASE_URL}/users/login`, payload, params);

  if (res.status === 401) {
    unauthorized.add(1);
  } else if (res.status === 429) {
    rateLimited.add(1);
  }

  check(res, {
    "status est 200": (r) => r.status === 200,
    "login réussi (success:true)": (r) => {
      try {
        return r.json("success") === true;
      } catch {
        return false; // body non-JSON (ex. 429) → check échoue proprement
      }
    },
    "token présent": (r) => {
      try {
        return typeof r.json("token") === "string" && r.json("token").length > 0;
      } catch {
        return false;
      }
    },
    "réponse < 800ms": (r) => r.timings.duration < 800,
  });

  sleep(1);
}
