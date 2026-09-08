import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

// ──────────────────────────────────────────────────────────────────────────────
// Test de charge — endpoint POST /itinerary/generate du backend Express
// MyTripCircle (server/routes/itinerary.js).
//
// Pourquoi cette route ? C'est le poste de charge réel du système. /health ne
// touche à rien et /login coûte un bcrypt ; ici chaque requête peut déclencher
// un appel à un grand modèle de langage (Groq, llama-3.3-70b-versatile), soit
// plusieurs secondes d'attente et un coût facturé au jeton. Deux mécanismes
// contiennent ce coût, et ce sont eux que le scénario mesure :
//   • un cache MongoDB de 7 jours (collection itinerary_cache, clé
//     ville + nombre de jours + version) ;
//   • un quota de 10 générations par utilisateur et par 24 h (collection
//     itinerary_usage, constante DAILY_LIMIT).
//
// Ce que le scénario prouve :
//   • l'écart de coût entre le chemin froid (cache manquant → appel Groq) et le
//     chemin chaud (cache présent → une lecture Mongo indexée), mesuré par deux
//     métriques Trend distinctes ;
//   • que le chemin chaud tient une charge concurrente sans dégradation, donc
//     que le cache est bien ce qui absorbe la montée en utilisateurs ;
//   • que le quota coupe la génération au 10ᵉ appel et renvoie un 429 propre.
//
// Ce que le scénario ne prouve pas :
//   • la latence du chemin froid n'est pas une mesure de notre serveur. Elle est
//     dominée par un fournisseur externe dont ni la file d'attente ni la
//     capacité ne sont sous notre contrôle. Elle sert d'ordre de grandeur, pas
//     de garantie de service ;
//   • l'échantillon froid est petit par construction (le quota le plafonne à 10
//     générations par compte et par 24 h). Le p95 froid est indicatif ;
//   • la mesure porte sur une instance unique, sans répartiteur de charge. Le
//     comportement d'un déploiement réparti est traité en annexe
//     (docs/dossier-annexe-C-passage-a-l-echelle.md), pas ici.
//
// Authentification : la route est derrière requireAuth (en-tête
// Authorization: Bearer <jwt>). Le jeton est obtenu une fois dans setup() via
// POST /users/login, selon le même schéma que tests/load/login.load.js. Aucun
// identifiant n'est écrit en dur (cf. CLAUDE.md).
//   k6 run -e EMAIL=test@exemple.com -e PASSWORD=motdepasse tests/load/itinerary.load.js
//
// ⚠️ Tenir le scénario sous le quota :
//   Le quota est vérifié AVANT le cache (itinerary.js, l'usage n'est écrit
//   qu'après une génération réussie). Conséquence utile : une réponse servie
//   par le cache ne consomme aucun quota, seule une génération réelle le fait.
//   Le scénario s'appuie sur cette propriété :
//     • setup() amorce une seule fois l'entrée chaude → 1 génération consommée ;
//     • ensuite, seuls les COLD_GENERATIONS premiers VUs font UNE requête
//       froide, sur leur première itération, avec une ville distincte ;
//     • toutes les autres itérations tapent la clé chaude, donc coûtent zéro
//       quota et peuvent tourner aussi longtemps que voulu.
//   Avec les valeurs par défaut : 1 (amorce) + 8 (froid) = 9 < 10 → marge d'une
//   génération. Pour observer volontairement le rejet de quota, lance avec :
//     -e COLD_GENERATIONS=20
//   (les 429 de quota sont comptés à part et n'invalident pas les seuils de
//   performance, comme les 429 du rate limiter dans health.load.js).
//
// ⚠️ Cache de 7 jours : une deuxième campagne lancée dans la semaine retombera
// sur des entrées déjà en cache, et le chemin « froid » ne sera plus froid. Les
// requêtes concernées sont comptées dans itinerary_cold_unexpected_cache_hit.
// Pour forcer de vrais défauts de cache, passe -e CACHE_SALT=<valeur unique> :
// le suffixe est ajouté au nom de ville, ce qui change la clé de cache.
// ──────────────────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";
const VUS = Number.parseInt(__ENV.VUS || "10", 10);
const EMAIL = __ENV.EMAIL;
const PASSWORD = __ENV.PASSWORD;

// Nombre de VUs autorisés à faire une génération réelle (1 chacun, sur leur
// première itération). Doit rester sous DAILY_LIMIT (10) amorce comprise.
const COLD_GENERATIONS = Number.parseInt(__ENV.COLD_GENERATIONS || "8", 10);

// Suffixe optionnel ajouté au nom de ville pour invalider le cache de 7 jours.
// Les caractères autorisés par la route sont lettres, chiffres, espaces et
// - . ' , ( ) — un identifiant de campagne convient.
const CACHE_SALT = __ENV.CACHE_SALT || "";

// Villes du chemin froid : une par VU froid, pour que chaque génération porte
// sur une clé de cache différente. La liste est plus longue que
// COLD_GENERATIONS par défaut, de façon à absorber un -e COLD_GENERATIONS plus
// élevé sans collision de clé.
const COLD_CITIES = [
  "Porto", "Séville", "Cracovie", "Naples", "Bergen", "Valence",
  "Tallinn", "Ljubljana", "Palerme", "Bruges", "Salzbourg", "Thessalonique",
  "Gdansk", "Cardiff", "Brno", "Malaga", "Turin", "Anvers",
  "Bilbao", "Rotterdam",
];

// Clé chaude : amorcée une fois dans setup(), puis servie par le cache pour
// toutes les itérations qui ne sont pas des générations réelles.
const WARM_CITY = "Lisbonne";
const WARM_DAYS = 3;
const COLD_DAYS = 3;

// Latences séparées : c'est la comparaison des deux qui fait la démonstration.
const coldDuration = new Trend("itinerary_cold_duration", true);
const warmDuration = new Trend("itinerary_warm_duration", true);

// Compteurs dédiés. Les deux familles de 429 sont distinguées par le corps de
// la réponse : le quota renvoie { error: "daily_limit_reached" }, le rate
// limiter renvoie { success: false, error: "Trop de requêtes..." }.
const quotaExceeded = new Counter("itinerary_429_daily_limit");
const rateLimited = new Counter("itinerary_429_rate_limited");
const aiNotConfigured = new Counter("itinerary_503_ai_not_configured");
const unexpectedCacheHit = new Counter("itinerary_cold_unexpected_cache_hit");

export const options = {
  stages: [
    { duration: "30s", target: VUS }, // montée
    { duration: "1m", target: VUS },  // palier
    { duration: "20s", target: 0 },   // descente
  ],
  thresholds: {
    // Chemin chaud : une lecture Mongo sur index (city, days) + sérialisation.
    // C'est le seul chiffre qui engage vraiment le serveur.
    "itinerary_warm_duration": ["p(95)<800"],
    // Chemin froid : appel réseau sortant vers Groq, génération d'un JSON de
    // plusieurs jours. Le seuil est un garde-fou de non-régression, pas un SLA.
    "itinerary_cold_duration": ["p(95)<20000"],
    // Moins de 1 % d'échecs réseau/serveur (429 et 503 suivis à part).
    "http_req_failed": ["rate<0.01"],
  },
};

// Seuls 2xx/3xx comptent comme succès pour http_req_failed ; les 429 et 503
// sont suivis via leurs compteurs dédiés.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }));

function cityFor(name) {
  return CACHE_SALT ? `${name} ${CACHE_SALT}` : name;
}

function generate(token, city, days) {
  return http.post(
    `${BASE_URL}/itinerary/generate`,
    JSON.stringify({ city, days }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      // La génération réelle prend plusieurs secondes ; on laisse la marge du
      // timeout k6 par défaut plutôt que de couper une réponse en cours.
      timeout: "60s",
    }
  );
}

// setup() s'exécute une fois avant la charge : validation des identifiants,
// récupération du jeton, puis amorce de l'entrée chaude. On échoue vite si une
// de ces trois étapes ne passe pas, car la campagne ne mesurerait rien.
export function setup() {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "Identifiants manquants. Lance avec : -e EMAIL=... -e PASSWORD=..."
    );
  }

  const loginRes = http.post(
    `${BASE_URL}/users/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (loginRes.status !== 200) {
    throw new Error(
      `Login impossible (status ${loginRes.status}) — jeton indisponible.`
    );
  }

  const token = loginRes.json("token");
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("Login sans jeton exploitable dans la réponse.");
  }

  // Amorce du chemin chaud : la première requête peut être une génération
  // réelle (et consommer 1 quota), les suivantes seront servies par le cache.
  const warmRes = generate(token, cityFor(WARM_CITY), WARM_DAYS);

  if (warmRes.status === 503) {
    throw new Error(
      "GROQ_API_KEY absente côté serveur (503 ai_not_configured) : le scénario ne mesurerait rien."
    );
  }
  if (warmRes.status !== 200) {
    throw new Error(
      `Amorçage du cache impossible (status ${warmRes.status}) — quota déjà épuisé ou route indisponible.`
    );
  }

  return { token };
}

export default function (data) {
  // Chaque VU dont l'index est sous COLD_GENERATIONS effectue exactement une
  // génération réelle, sur sa première itération, avec une ville qui lui est
  // propre. Toutes les autres itérations exercent le chemin chaud.
  const isCold = __ITER === 0 && __VU <= COLD_GENERATIONS;
  const city = isCold
    ? cityFor(COLD_CITIES[(__VU - 1) % COLD_CITIES.length])
    : cityFor(WARM_CITY);
  const days = isCold ? COLD_DAYS : WARM_DAYS;

  const res = generate(data.token, city, days);

  if (res.status === 429) {
    let reason = null;
    try {
      reason = res.json("error");
    } catch {
      reason = null; // corps non-JSON : on classe en rate limiter par défaut
    }
    if (reason === "daily_limit_reached") {
      quotaExceeded.add(1);
    } else {
      rateLimited.add(1);
    }
  } else if (res.status === 503) {
    aiNotConfigured.add(1);
  }

  if (res.status === 200) {
    let servedFromCache = null;
    try {
      servedFromCache = res.json("cached");
    } catch {
      servedFromCache = null; // corps illisible : la latence n'est pas classée
    }

    if (servedFromCache === false) {
      coldDuration.add(res.timings.duration);
    } else if (servedFromCache === true) {
      warmDuration.add(res.timings.duration);
      // Une requête voulue froide servie par le cache signale une clé déjà
      // présente (campagne rejouée dans les 7 jours) : la mesure froide est
      // alors incomplète, d'où le compteur.
      if (isCold) {
        unexpectedCacheHit.add(1);
      }
    }
  }

  check(res, {
    "status est 200": (r) => r.status === 200,
    "itinéraire présent": (r) => {
      try {
        return typeof r.json("itinerary") === "object" && r.json("itinerary") !== null;
      } catch {
        return false; // body non-JSON (ex. 429) → check échoue proprement
      }
    },
    "champ cached renseigné": (r) => {
      try {
        return typeof r.json("cached") === "boolean";
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
