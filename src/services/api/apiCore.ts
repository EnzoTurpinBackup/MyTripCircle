/**
 * Point d'accès HTTP unique du client.
 *
 * Aucun écran n'émet de requête réseau par lui-même : tout passe par
 * {@link request}, puis par les enveloppes de domaine (`tripsApi`, `authApi`,
 * etc.). Ce module concentre trois mécanismes transverses, et ce regroupement
 * est un choix de conception assumé plutôt qu'une commodité.
 *
 * 1. Découverte de l'adresse du serveur. `API_URLS` liste les hôtes candidats ;
 *    le premier qui répond à `/health` dans le délai imparti est retenu pour la
 *    session. Résoudre l'adresse ici évite que la couche de présentation ait
 *    connaissance de la topologie réseau : changer d'environnement ne touche
 *    aucun écran.
 *
 * 2. Renouvellement du jeton d'accès. Les access tokens sont volontairement de
 *    courte durée, donc un 401 est un événement courant et non une erreur
 *    métier. La requête interrompue est rejouée après renouvellement, si bien
 *    que l'appelant n'observe qu'un appel réussi. Déporter cette reprise dans
 *    les écrans obligerait chacun à dupliquer la séquence et à gérer seul la
 *    concurrence entre plusieurs 401 simultanés.
 *
 * 3. Purge de session. Lorsque le renouvellement échoue, jetons et profil en
 *    cache sont effacés et le callback d'invalidation est déclenché. La
 *    redirection reste à la charge de l'AuthContext : ce module ignore la
 *    navigation et le rendu, ce qui le laisse testable hors de tout arbre React.
 */
import { API_URLS } from "../../config/api";
import * as secureStorage from "../../utils/secureStorage";
import logger from "../../utils/logger";

/** Verbes HTTP exposés par la couche d'accès ; le serveur n'en expose pas d'autres. */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/** Adresse retenue par la découverte, mémorisée pour éviter un sondage par requête. */
let workingUrl: string | null = null;

// Une seule découverte d’URL à la fois : au démarrage, plusieurs requêtes parallèles
// partagent la même promesse (évite le spam de logs et N appels /health).
let findWorkingUrlPromise: Promise<string> | null = null;

// Callback déclenché quand le refresh échoue, pour notifier l'AuthContext de déconnecter l'utilisateur
let onUnauthorizedCallback: (() => void) | null = null;

/**
 * Enregistre la réaction à une session devenue invalide.
 *
 * L'inversion de dépendance est volontaire : la couche réseau signale la perte
 * de session, mais c'est l'AuthContext qui décide de vider son état et de
 * rediriger. Sans cela, ce module devrait importer la navigation et deviendrait
 * impossible à tester isolément.
 *
 * @param cb Action exécutée après la purge des jetons, typiquement la
 *   déconnexion applicative branchée par l'AuthContext.
 */
export function setUnauthorizedCallback(cb: () => void): void {
  onUnauthorizedCallback = cb;
}

/**
 * Détache la réaction enregistrée, au démontage du fournisseur d'authentification.
 *
 * Évite qu'un callback capturant un état démonté reste appelable et provoque
 * une mise à jour sur un arbre disparu.
 */
export function clearUnauthorizedCallback(): void {
  onUnauthorizedCallback = null;
}

/**
 * Résout l'adresse du serveur en interrogeant les candidates dans l'ordre déclaré.
 *
 * Chaque tentative est bornée par un délai d'expiration explicite : sans lui,
 * une adresse injoignable laisserait l'application suspendue sur un `fetch` que
 * la plateforme peut mettre plusieurs dizaines de secondes à abandonner. La
 * première réponse favorable est mémorisée, les suivantes ne sondent plus.
 *
 * @returns L'adresse de base retenue pour la session.
 * @throws {Error} Si aucune candidate ne répond ; l'appel initial échoue alors
 *   franchement plutôt que de laisser l'écran attendre une réponse qui ne
 *   viendra pas.
 */
async function findWorkingUrl(): Promise<string> {
  if (workingUrl) return workingUrl;
  if (findWorkingUrlPromise) return findWorkingUrlPromise;

  findWorkingUrlPromise = (async () => {
    logger.debug("[ApiService] Starting to find working URL...");

    for (const url of API_URLS) {
      try {
        logger.debug(`[ApiService] Trying ${url}...`);
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        try {
          const response = await fetch(`${url}/health`, { method: "GET", signal: ctrl.signal });
          if (response.ok) {
            workingUrl = url;
            logger.debug(`[ApiService] ✅ Success! Using URL: ${url}`);
            return url;
          }
          logger.debug(`[ApiService] ❌ ${url} returned status: ${response.status}`);
        } finally {
          // Toujours nettoyer le timer d'abandon, même si fetch rejette
          clearTimeout(timer);
        }
      } catch (error: any) {
        logger.debug(`[ApiService] ❌ Failed to connect to ${url}: ${error?.message ?? String(error)}`);
      }
    }

    logger.debug("[ApiService] ❌ No working URL found!");
    throw new Error("No working API URL found. Make sure the backend is running.");
  })();

  try {
    return await findWorkingUrlPromise;
  } finally {
    findWorkingUrlPromise = null;
  }
}

// Mutex : évite les refreshes parallèles (race condition sur la rotation du refresh token).
// Si plusieurs requêtes obtiennent un 401 simultanément, elles partagent toutes la même promesse.
let refreshPromise: Promise<string | null> | null = null;

/**
 * Tente de renouveler l'access token à partir du refresh token conservé.
 *
 * @returns Le nouvel access token, ou `null` si aucun refresh token n'est
 *   stocké, si le serveur refuse la rotation, ou si le réseau est indisponible.
 *   L'absence d'exception est délibérée : un renouvellement infructueux n'est
 *   pas une erreur à remonter à l'écran, mais un signal laissant {@link request}
 *   arbitrer entre reprise et purge de session.
 */
async function tryRefreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await secureStorage.getItem("refreshToken");
      if (!refreshToken) return null;

      const baseUrl = await findWorkingUrl();
      const res = await fetch(`${baseUrl}/users/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (data.success && data.token) {
        await secureStorage.setItem("token", data.token);
        // Rotation : sauvegarde le nouveau refresh token si le serveur en a émis un
        if (data.refreshToken) {
          await secureStorage.setItem("refreshToken", data.refreshToken);
        }
        return data.token;
      }
      return null;
    } catch (e) {
      if (__DEV__) console.warn("[apiCore] Erreur refresh token:", e);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Efface les traces de la session puis signale l'invalidation à l'application.
 *
 * Le profil en cache est retiré au même titre que les jetons : le conserver
 * laisserait l'interface afficher des données personnelles alors que plus aucun
 * appel authentifié n'est possible.
 */
async function clearSession(): Promise<void> {
  await secureStorage.multiRemove(["token", "refreshToken", "user"]);
  onUnauthorizedCallback?.();
}

/**
 * Convertit une réponse en échec en exception porteuse du message du serveur.
 *
 * Le corps est renormalisé plutôt que transmis brut afin que les appelants
 * disposent toujours d'une chaîne exploitable, y compris quand le serveur
 * répond en texte simple ou avec un corps vide.
 *
 * @param res Réponse en échec, dont le corps n'a pas encore été consommé.
 * @param statusCode Statut HTTP, utilisé comme message de repli.
 * @returns Ne retourne jamais.
 * @throws {Error} Systématiquement, avec le message du serveur ou `HTTP <code>`.
 */
async function parseErrorAndThrow(res: Response, statusCode: number): Promise<never> {
  const errText = await res.text();
  let parsed: string;
  try {
    parsed = JSON.stringify(JSON.parse(errText));
  } catch {
    parsed = errText || `HTTP ${statusCode}`;
  }
  throw new Error(parsed);
}

/**
 * Traite l'échec d'une requête déjà rejouée avec un jeton fraîchement obtenu.
 *
 * Un second 401 signifie que le renouvellement n'a pas rétabli les droits : la
 * session est alors purgée sans nouvelle tentative, pour ne pas enfermer le
 * client dans une boucle de rejeu.
 *
 * @param retryRes Réponse en échec de la requête rejouée.
 * @returns Ne retourne jamais.
 * @throws {Error} Toujours, avec le message renvoyé par le serveur.
 */
async function handleRetryResponse(retryRes: Response): Promise<never> {
  if (retryRes.status === 401) {
    await clearSession();
  }
  return parseErrorAndThrow(retryRes, retryRes.status);
}

/**
 * Émet une requête authentifiée vers l'API et restitue le corps désérialisé.
 *
 * Les enveloppes de domaine s'appuient toutes sur cette fonction, si bien
 * qu'adresse du serveur, en-tête d'autorisation, renouvellement de jeton et
 * normalisation des erreurs sont traités en un seul endroit. Un appelant
 * n'observe donc que deux issues : la donnée attendue, ou une exception dont le
 * message est prêt à être traduit.
 *
 * @typeParam T Forme du corps de réponse attendue par l'appelant ; elle n'est
 *   pas validée à l'exécution et relève du contrat passé avec le serveur.
 * @param path Chemin relatif à l'adresse de base, avec sa chaîne de requête
 *   déjà encodée le cas échéant.
 * @param method Verbe HTTP traduisant l'intention métier (lecture, création,
 *   mise à jour, suppression).
 * @param body Charge utile sérialisée en JSON ; omise pour les lectures.
 * @returns Le corps de la réponse une fois désérialisé.
 * @throws {Error} Si aucune adresse de serveur n'est joignable, ou si le
 *   serveur répond en échec. Un 401 non rattrapable purge la session au
 *   préalable : l'appelant peut donc afficher le message sans se soucier de la
 *   déconnexion, déjà prise en charge.
 */
export async function request<T>(
  path: string,
  method: HttpMethod = "GET",
  body?: any,
): Promise<T> {
  const baseUrl = await findWorkingUrl();
  const token = await secureStorage.getItem("token");
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    // Tentative de refresh silencieux avant de déconnecter
    const newToken = await tryRefreshToken();
    if (newToken) {
      // Rejoue la requête originale avec le nouveau token
      const retryRes = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (retryRes.ok) {
        return (await retryRes.json()) as T;
      }

      return handleRetryResponse(retryRes);
    }

    // Pas de refresh token disponible ou refresh échoué → déconnexion
    await clearSession();
    return parseErrorAndThrow(res, res.status);
  }

  if (!res.ok) {
    return parseErrorAndThrow(res, res.status);
  }

  return (await res.json()) as T;
}
