/**
 * Journal applicatif à verbosité conditionnée par l'environnement.
 *
 * `debug` et `info` sont muets en production : outils de diagnostic, ils alourdiraient la
 * console d'un appareil livré et risqueraient d'y exposer des données de compte. `warn` et
 * `error` restent actifs partout — un incident doit rester traçable là où il se produit.
 *
 * Ce module ne filtre pas ce qu'on lui passe : ne jamais journaliser jeton, mot de passe ni
 * donnée personnelle incombe à l'appelant, y compris aux niveaux muets en production, qui
 * restent bien visibles pendant le développement.
 */

/** Évalué à l'import : la verbosité est figée pour toute la durée du processus. */
const IS_PROD = process.env.NODE_ENV === "production";

const logger = {
  debug: (...args: unknown[]) => { if (!IS_PROD) console.log("[debug]", ...args); },
  info:  (...args: unknown[]) => { if (!IS_PROD) console.log("[info]",  ...args); },
  warn:  (...args: unknown[]) => console.warn("[warn]",  ...args),
  error: (...args: unknown[]) => console.error("[error]", ...args),
};

export default logger;
