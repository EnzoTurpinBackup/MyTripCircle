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
    "!**/__tests__/**",
    "!**/*.d.ts",
    "!src/services/api/index.ts",
    "!src/utils/i18n/**",
    "!server/index.js",
    "!server/db.js",
  ],
};
