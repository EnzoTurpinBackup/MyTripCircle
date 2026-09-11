// Deux projets Jest : le client Expo/React Native (preset jest-expo) et les
// scripts d'outillage (environnement node). Lancer les deux avec `npm test`.
// L'API vit désormais dans son propre dépôt et porte ses propres tests.
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
      displayName: "scripts",
      testEnvironment: "node",
      testMatch: ["<rootDir>/scripts/**/*.test.js"],
      modulePathIgnorePatterns: ["<rootDir>/.claude/"],
    },
  ],
  // Périmètre de couverture : l'intégralité du code applicatif (client, serveur,
  // scripts), moins les omissions explicites ci-dessous. Un fichier absent de la
  // mesure est un fichier dont personne ne sait s'il est testé — toute exception
  // doit donc être justifiée ici, et le périmètre reste aligné sur
  // `sonar.coverage.exclusions` dans sonar-project.properties.
  collectCoverageFrom: [
    "App.tsx",
    "index.ts",
    "src/**/*.{ts,tsx}",
    "scripts/**/*.js",

    // Tests, déclarations de types et barils de réexport : aucun code exécutable.
    "!**/__tests__/**",
    "!**/*.d.ts",
    "!src/types/**",
    "!src/services/api/index.ts",

    // Données statiques et dictionnaires de traduction : aucune logique.
    "!src/data/**",
    "!src/utils/i18n/**",

    // Outils de développement interactifs (QR code Expo, détection d'IP locale) :
    // pilotés par la console et l'environnement, hors périmètre unitaire.
    "!scripts/start-with-qr.js",
    "!scripts/update-ip.js",
  ],
};
