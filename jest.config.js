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
  // Périmètre de couverture : l'intégralité du code applicatif (client, serveur,
  // scripts), moins les omissions explicites ci-dessous. Un fichier absent de la
  // mesure est un fichier dont personne ne sait s'il est testé — toute exception
  // doit donc être justifiée ici, et le périmètre reste aligné sur
  // `sonar.coverage.exclusions` dans sonar-project.properties.
  collectCoverageFrom: [
    "App.tsx",
    "index.ts",
    "src/**/*.{ts,tsx}",
    "server/**/*.js",
    "scripts/**/*.js",

    // Tests, déclarations de types et barils de réexport : aucun code exécutable.
    "!**/__tests__/**",
    "!**/*.d.ts",
    "!src/types/**",
    "!src/services/api/index.ts",

    // Données statiques et dictionnaires de traduction : aucune logique.
    "!src/data/**",
    "!src/utils/i18n/**",

    // Points d'entrée du serveur : validés par les tests d'intégration, qui
    // démarrent l'application plutôt que d'en tester les unités.
    "!server/index.js",
    "!server/db.js",

    // Outils de développement interactifs (QR code Expo, détection d'IP locale,
    // création d'un utilisateur de charge) : pilotés par la console et
    // l'environnement, hors périmètre unitaire.
    "!scripts/start-with-qr.js",
    "!scripts/update-ip.js",
    "!scripts/create-test-user.js",
  ],
};
