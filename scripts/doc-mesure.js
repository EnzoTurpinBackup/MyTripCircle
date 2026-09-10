#!/usr/bin/env node
/**
 * Point d'entrée en ligne de commande de `npm run doc:mesure`.
 *
 * Séparé du module de mesure pour que celui-ci reste importable sans effet de
 * bord, et pour que le lancement lui-même soit couvert par les tests : un
 * garde `require.main === module` n'est jamais vrai sous Jest.
 */
require("./mesure-doc-interne").principal();
