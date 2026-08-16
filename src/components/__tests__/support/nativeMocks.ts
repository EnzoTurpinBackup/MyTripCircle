/**
 * Frontières natives neutralisées pour les tests de rendu de composants.
 *
 * `jest.config.js` n'expose pas de `setupFiles` pour le projet client : ce
 * module doit donc être importé EN PREMIER par chaque suite de composants, afin
 * que les `jest.mock` soient enregistrés avant le chargement du composant testé.
 */

jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Le mock officiel de la safe area est exporté par défaut : il faut le déballer.
jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);

export {};
