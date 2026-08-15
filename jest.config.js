// Deux projets Jest : le client Expo/React Native (preset jest-expo) et le
// backend Node/Express (environnement node). Lancer les deux avec `npm test`.
module.exports = {
  projects: [
    {
      displayName: "client",
      preset: "jest-expo",
      testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
      modulePathIgnorePatterns: [
        "<rootDir>/.claude/",
        "<rootDir>/ios/",
        "<rootDir>/android/",
      ],
    },
    {
      displayName: "server",
      testEnvironment: "node",
      testMatch: ["<rootDir>/server/**/*.test.js"],
      setupFiles: ["<rootDir>/server/__tests__/setupEnv.js"],
      modulePathIgnorePatterns: ["<rootDir>/.claude/"],
    },
    {
      displayName: "scripts",
      testEnvironment: "node",
      testMatch: ["<rootDir>/scripts/**/*.test.js"],
      modulePathIgnorePatterns: ["<rootDir>/.claude/"],
    },
  ],
  // Périmètre de couverture restreint à la couche réellement testable unitairement
  // (logique métier client + backend). Écrans, composants UI, contextes,
  // navigation et fichiers de données/traductions sont validés autrement
  // (tests d'intégration, recette manuelle, TestFlight) et hors périmètre ici.
  collectCoverageFrom: [
    "src/services/**/*.ts",
    "src/utils/**/*.ts",
    "src/hooks/**/*.{ts,tsx}",
    "src/components/**/*Helpers.ts",
    "server/**/*.js",
    "scripts/**/*.js",
    "!**/__tests__/**",
    // Outils de développement interactifs (QR code Expo, détection d'IP locale) :
    // pilotés par la console et l'environnement, hors périmètre unitaire.
    "!scripts/start-with-qr.js",
    "!scripts/update-ip.js",
    "!**/*.d.ts",
    "!src/services/api/index.ts",
    "!src/utils/i18n/**",
    "!server/index.js",
    "!server/db.js",
  ],
};
