/**
 * Frontières natives neutralisées pour les tests de rendu d'écrans.
 *
 * `jest.config.js` n'expose pas de `setupFiles` pour le projet client : ce
 * module doit donc être importé EN PREMIER par chaque suite d'écran, afin que
 * les `jest.mock` soient enregistrés avant le chargement de l'écran testé.
 *
 * Il complète `src/components/__tests__/support/nativeMocks.ts` (stockage
 * asynchrone, safe area) par la police d'icônes, que les écrans montent presque
 * toujours : `@expo/vector-icons` charge ses glyphes via une chaîne asynchrone
 * au montage, chaîne qui ne se résout jamais sous faux timers et fait expirer
 * le nettoyage automatique de RNTL.
 */

import "../../../components/__tests__/support/nativeMocks";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: Object.assign(
      ({ name }: { name: string }) => React.createElement(Text, null, `icon:${name}`),
      { glyphMap: {} },
    ),
  };
});

export {};
