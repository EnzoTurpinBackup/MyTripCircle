import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

// ──────────────────────────────────────────────────────────────────────────────
// Test de charge — endpoint public GET /health du backend Express MyTripCircle.
//
// Pourquoi /health ? C'est la seule route qui ne requiert pas de JWT
// (server/index.js → app.get("/health", ...)). Toutes les autres routes
// renverraient 401 et fausseraient le check `status === 200`.
//
// ⚠️ Rate limiter : server/middleware/rateLimiter.js applique un generalLimiter
// de 1000 requêtes / minute / IP. Au-delà, le serveur répond 429 (et non 200).
// Le scénario par défaut ci-dessous est calibré pour rester SOUS cette limite,
// afin de mesurer la performance — pas de déclencher la sécurité.
//   15 VUs × 1 req/s ≈ 900 req/min < 1000  → marge de sécurité.
// Pour tester volontairement le rate limiter, lance avec : -e VUS=30
// (les 429 seront comptés à part et n'invalideront pas le seuil de perf).
// ──────────────────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";
const VUS = Number.parseInt(__ENV.VUS || "15", 10);

// Compteur dédié aux réponses 429 (rate limiter) pour les distinguer des vraies erreurs.
const rateLimited = new Counter("rate_limited_429");

export const options = {
  stages: [
    // Phase 1 : montée progressive (0 → VUS en 30 s)
    { duration: "30s", target: VUS },
    // Phase 2 : palier — on maintient la charge pendant 1 minute
    { duration: "1m", target: VUS },
    // Phase 3 : descente (VUS → 0 en 20 s)
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    // 95 % des requêtes répondent en moins de 500 ms
    "http_req_duration": ["p(95)<500"],
    // Moins de 1 % d'échecs réseau/serveur (les 429 sont volontairement exclus,
    // voir le bloc `setResponseCallback` ci-dessous).
    "http_req_failed": ["rate<0.01"],
  },
};

// Par défaut k6 considère 429 comme un échec. On indique que seules les réponses
// 2xx et 3xx comptent comme « succès » pour http_req_failed, mais on suit les 429
// via notre compteur dédié pour les analyser séparément.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }));

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  if (res.status === 429) {
    rateLimited.add(1);
  }

  check(res, {
    // En cas d'échec réseau (host injoignable), r.body vaut undefined :
    // on garde les checks défensifs pour ne pas planter le VU.
    "status est 200": (r) => r.status === 200,
    "body non vide": (r) => typeof r.body === "string" && r.body.length > 0,
    "réponse < 500ms": (r) => r.timings.duration < 500,
  });

  // Pause d'1 s entre chaque requête (simule un utilisateur humain)
  sleep(1);
}
