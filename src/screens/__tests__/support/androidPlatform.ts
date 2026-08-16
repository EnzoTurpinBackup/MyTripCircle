/**
 * Bascule le module `Platform` de React Native sur Android.
 *
 * Plusieurs écrans choisissent une valeur au *chargement du module* — une marge
 * dans un `StyleSheet.create`, une URL de store — via `Platform.OS` ou
 * `Platform.select`. La suite principale s'exécutant sur la plateforme iOS par
 * défaut de `jest-expo`, ces branches ne peuvent être atteintes que depuis une
 * suite dédiée qui importe ce module EN PREMIER, avant l'écran testé.
 */

jest.mock("react-native/Libraries/Utilities/Platform", () => {
  const actual = jest.requireActual("react-native/Libraries/Utilities/Platform");
  const base = actual.default ?? actual;
  const android = {
    ...base,
    OS: "android",
    select: (options: Record<string, unknown>) =>
      "android" in options ? options.android : options.default,
  };
  return { __esModule: true, default: android, ...android };
});

export {};
