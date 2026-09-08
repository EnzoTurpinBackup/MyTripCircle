const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  analyserSource,
  calculerTaux,
  mesurer,
  lireOptions,
  principal,
} = require("../mesure-doc-interne");

/** Options par défaut du script, telles que produites par `lireOptions([])`. */
const OPTIONS = { json: false, sansDonnees: false, profondeur: 3, depot: null };

/** Fichier témoin : 1 ligne de code, 1 ligne de commentaire. Toujours dans le périmètre. */
const TEMOIN = ["// Fichier témoin du périmètre.", "export const A = 1;"].join("\n");

const depotsTemporaires = [];

/** Matérialise une arborescence `{ chemin relatif: contenu }` dans un dépôt jetable. */
function creerDepot(arborescence) {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), "mesure-doc-"));
  depotsTemporaires.push(racine);
  for (const [cheminRelatif, contenu] of Object.entries(arborescence)) {
    const absolu = path.join(racine, cheminRelatif);
    fs.mkdirSync(path.dirname(absolu), { recursive: true });
    fs.writeFileSync(absolu, contenu, "utf8");
  }
  return racine;
}

/** Mesure une arborescence jetable avec les options par défaut. */
function mesurerArborescence(arborescence, options = {}) {
  return mesurer(creerDepot(arborescence), { ...OPTIONS, ...options });
}

afterAll(() => {
  for (const racine of depotsTemporaires) {
    fs.rmSync(racine, { recursive: true, force: true });
  }
});

describe("analyserSource — lexique", () => {
  it("should count the trailing comment when a JSX closing tag precedes it", () => {
    // Arrange — le `/` de `</Text>` a déjà été lu à tort comme une ouverture
    // d'expression régulière, ce qui avalait le commentaire de fin de ligne.
    const source = "</Text> // fermeture du bloc";

    // Act
    const result = analyserSource(source);

    // Assert
    expect(result).toMatchObject({ code: 1, commentaire: 1, mixte: 1 });
  });

  it("should count no comment when a URL appears in JSX text", () => {
    const source = "<Text>Voir https://exemple.fr</Text>";

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 1, commentaire: 0 });
  });

  it("should count no comment when a double slash sits inside a string literal", () => {
    const source = "const chemin = 'dossier // sous-dossier';";

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 1, commentaire: 0 });
  });

  it("should count no comment when a URL is stored in a string literal", () => {
    const source = 'const lien = "https://exemple.fr/api//v2";';

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 1, commentaire: 0 });
  });

  it("should count no comment when a block delimiter sits inside a string literal", () => {
    const source = 'const motif = "/* ceci n\'est pas un commentaire */";';

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 1, commentaire: 0 });
  });

  it("should count no comment when slashes belong to a regular expression literal", () => {
    const source = "const motif = /a\\/\\/b/;";

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 1, commentaire: 0 });
  });

  it("should count the trailing comment when a regular expression literal precedes it", () => {
    const source = "const motif = /[a/b]+/; // séparateurs acceptés";

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 1, commentaire: 1, mixte: 1 });
  });

  it("should count the trailing comment when a template holds braces and quotes", () => {
    const source = 'const msg = `Bonjour ${nom} ${ { a: "b // c" }.a } !`; // salutation';

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 1, commentaire: 1, mixte: 1 });
  });

  it("should skip decoration lines when a JSDoc block documents a function", () => {
    const source = [
      "/**",
      " * Calcule le total.",
      " * @param {number} a Montant.",
      " */",
      "function total(a) {",
      "  return a;",
      "}",
    ].join("\n");

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 3, commentaire: 2, mixte: 0, vides: 2 });
  });

  it("should count every text line when a block comment spans several lines", () => {
    const source = ["/* Première ligne", "   seconde ligne */", "const a = 1;"].join("\n");

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 1, commentaire: 2 });
  });

  it("should count both sides when code and a trailing comment share a line", () => {
    const source = "const a = 1; // compteur";

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 1, commentaire: 1, mixte: 1 });
  });

  it("should count nowhere when the line is empty", () => {
    const source = ["const a = 1;", "", "const b = 2;"].join("\n");

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 2, commentaire: 0, vides: 1 });
  });

  it("should count no comment when an escaped quote precedes it inside a string", () => {
    const source = 'const a = "il dit \\"bonjour\\" // ici";';

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 1, commentaire: 0 });
  });

  it("should count no comment when an escaped backtick sits inside a template", () => {
    const source = "const a = `accent \\` puis // ici`;";

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 1, commentaire: 0 });
  });

  it("should count no comment when an escaped bracket sits inside a regex class", () => {
    const source = "const r = /[\\]]/;";

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 1, commentaire: 0 });
  });

  it("should still read the next line when an apostrophe opens an unterminated string", () => {
    // Arrange — le texte JSX en français ouvre une chaîne qui ne se referme jamais ;
    // sans le garde-fou de fin de ligne, le commentaire suivant serait avalé.
    const source = ["<Text>L'été</Text>", "// note de bas de bloc"].join("\n");

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 1, commentaire: 1, mixte: 0 });
  });

  it("should ignore the comment when it only carries a tooling directive", () => {
    const source = "const a = 1; // eslint-disable-line no-magic-numbers";

    const result = analyserSource(source);

    expect(result).toMatchObject({ code: 1, commentaire: 0 });
  });
});

describe("analyserSource — formule", () => {
  it("should split a hand-checked source into three code and two comment lines", () => {
    // Arrange — cas de référence de l'annexe I : 5 lignes, dont 1 vide et 1 mixte.
    const source = [
      "// Résumé du module.",
      "const a = 1;",
      "const b = 2;",
      "",
      "module.exports = { a, b }; // export public",
    ].join("\n");

    // Act
    const result = analyserSource(source);

    // Assert
    expect(result).toEqual({ code: 3, commentaire: 2, mixte: 1, vides: 1, total: 5 });
  });
});

describe("calculerTaux", () => {
  it("should divide comments by the sum of code and comments when both are present", () => {
    // Arrange
    const code = 3;
    const commentaire = 2;

    // Act
    const result = calculerTaux(code, commentaire);

    // Assert
    expect(result).toBe(40);
  });

  it("should reproduce the certified rate when fed the repository totals", () => {
    const result = calculerTaux(41413, 6123);

    expect(result).toBe(12.88);
  });

  it("should round to the nearest hundredth when the ratio is not exact", () => {
    const result = calculerTaux(2, 1);

    expect(result).toBe(33.33);
  });

  it("should return zero when the file holds neither code nor comments", () => {
    const result = calculerTaux(0, 0);

    expect(result).toBe(0);
  });
});

describe("mesurer — périmètre", () => {
  it("should aggregate code and comments across roots when files are in scope", () => {
    // Arrange
    const arborescence = {
      "src/module.ts": "// Point d'entrée du module.\nexport const VERSION = 1;",
      "server/api.js": "const express = require('express');\nmodule.exports = express;",
    };

    // Act
    const result = mesurerArborescence(arborescence);

    // Assert
    expect(result.total).toMatchObject({ fichiers: 2, code: 3, commentaire: 1, taux: 25 });
  });

  it("should ignore test files when the file name carries the test suffix", () => {
    const result = mesurerArborescence({
      "src/garde.ts": TEMOIN,
      "src/garde.test.ts": TEMOIN,
    });

    expect(result.total.fichiers).toBe(1);
  });

  it("should ignore spec files when the file name carries the spec suffix", () => {
    const result = mesurerArborescence({
      "src/garde.ts": TEMOIN,
      "src/garde.spec.tsx": TEMOIN,
    });

    expect(result.total.fichiers).toBe(1);
  });

  it("should ignore declaration files when the extension is .d.ts", () => {
    const result = mesurerArborescence({
      "src/garde.ts": TEMOIN,
      "src/global.d.ts": TEMOIN,
    });

    expect(result.total.fichiers).toBe(1);
  });

  it.each([
    "__tests__",
    "__mocks__",
    "node_modules",
    "coverage",
    ".expo",
    ".git",
    "ios",
    "android",
    "dist",
    "build",
    "web-build",
  ])("should ignore the %s directory when it holds code files", (repertoire) => {
    const result = mesurerArborescence({
      "src/garde.ts": TEMOIN,
      [`src/${repertoire}/exclu.ts`]: TEMOIN,
    });

    expect(result.total.fichiers).toBe(1);
  });

  it("should ignore files outside the analysed roots when they hold code", () => {
    const result = mesurerArborescence({
      "src/garde.ts": TEMOIN,
      "docs/exemple.ts": TEMOIN,
    });

    expect(result.total.fichiers).toBe(1);
  });

  it("should ignore files whose extension is not application code", () => {
    const result = mesurerArborescence({
      "src/garde.ts": TEMOIN,
      "src/style.css": "/* rouge */\n.a { color: red; }",
    });

    expect(result.total.fichiers).toBe(1);
  });

  it("should ignore generated files when the header carries the generated banner", () => {
    const result = mesurerArborescence({
      "src/garde.ts": TEMOIN,
      "src/api.ts": `/** @generated */\n${TEMOIN}`,
    });

    expect(result.total).toMatchObject({ fichiers: 1, ignores: 1 });
  });

  it("should ignore static data directories when the sansDonnees option is set", () => {
    const result = mesurerArborescence(
      { "src/garde.ts": TEMOIN, "src/data/pays.ts": TEMOIN },
      { sansDonnees: true }
    );

    expect(result.total).toMatchObject({ fichiers: 1, ignores: 1 });
  });

  it("should keep static data directories when the sansDonnees option is absent", () => {
    const result = mesurerArborescence({
      "src/garde.ts": TEMOIN,
      "src/data/pays.ts": TEMOIN,
    });

    expect(result.total).toMatchObject({ fichiers: 2, ignores: 0 });
  });

  it("should report an empty scope when no analysed root exists", () => {
    const result = mesurerArborescence({ "docs/lisezmoi.ts": TEMOIN });

    expect(result.total).toMatchObject({ fichiers: 0, code: 0, commentaire: 0, taux: 0 });
  });
});

describe("mesurer — regroupement et verdict", () => {
  it("should group directories at the requested depth when the option is set", () => {
    // Arrange
    const arborescence = {
      "src/services/api/client.ts": TEMOIN,
      "src/services/api/session.ts": TEMOIN,
    };

    // Act
    const result = mesurerArborescence(arborescence, { profondeur: 2 });

    // Assert
    expect(result.repertoires.map((r) => r.repertoire)).toEqual(["src/services"]);
  });

  it("should sort directories by decreasing code volume when several are measured", () => {
    const result = mesurerArborescence({
      "src/petit.ts": "export const A = 1;",
      "server/gros.js": "const a = 1;\nconst b = 2;\nconst c = 3;",
    });

    expect(result.repertoires.map((r) => r.repertoire)).toEqual(["server", "src"]);
  });

  it("should declare the rate inside the range when it sits between the thresholds", () => {
    const result = mesurerArborescence({
      "src/module.ts": [
        "// Module de démonstration.",
        "export const A = 1;",
        "export const B = 2;",
        "export const C = 3;",
        "export const D = 4;",
        "export const E = 5;",
        "export const F = 6;",
        "export const G = 7;",
        "export const H = 8;",
      ].join("\n"),
    });

    expect(result.total.taux).toBe(11.11);
    expect(result.verdict).toBe("dans la fourchette");
  });

  it("should declare the rate below the range when no comment is present", () => {
    const result = mesurerArborescence({
      "src/brut.ts": "export const A = 1;\nexport const B = 2;",
    });

    expect(result.verdict).toBe("sous la fourchette");
  });

  it("should declare the rate above the range when comments dominate", () => {
    const result = mesurerArborescence({
      "src/riche.ts": "// Un.\n// Deux.\n// Trois.\nexport const A = 1;",
    });

    expect(result.verdict).toBe("au-dessus de la fourchette");
  });
});

describe("lireOptions", () => {
  it("should fall back to the default depth when no argument is passed", () => {
    // Arrange
    const argv = [];

    // Act
    const result = lireOptions(argv);

    // Assert
    expect(result).toEqual({ json: false, sansDonnees: false, profondeur: 3, depot: null });
  });

  it("should enable the JSON output when the --json flag is passed", () => {
    const result = lireOptions(["--json"]);

    expect(result.json).toBe(true);
  });

  it("should read the requested depth when --profondeur is passed", () => {
    const result = lireOptions(["--profondeur=2"]);

    expect(result.profondeur).toBe(2);
  });

  it("should resolve the repository path when --depot is passed", () => {
    const result = lireOptions(["--depot=./ailleurs"]);

    expect(result.depot).toBe(path.resolve("./ailleurs"));
  });

  it("should exclude static data when the --sans-donnees flag is passed", () => {
    const result = lireOptions(["--sans-donnees"]);

    expect(result.sansDonnees).toBe(true);
  });
});

describe("principal", () => {
  const argvInitial = process.argv;

  /** Exécute le script en ligne de commande et retourne les lignes écrites. */
  function executer(argumentsCli) {
    const journal = jest.spyOn(console, "log").mockImplementation(() => {});
    process.argv = ["node", "mesure-doc-interne.js", ...argumentsCli];
    principal();
    return journal.mock.calls.map(([ligne]) => ligne);
  }

  afterEach(() => {
    process.argv = argvInitial;
    jest.restoreAllMocks();
  });

  it("should print a JSON payload holding the total when --json is passed", () => {
    // Arrange
    const depot = creerDepot({
      "src/module.ts": "// Point d'entrée du module.\nexport const VERSION = 1;",
      "server/api.js": "const express = require('express');\nmodule.exports = express;",
    });

    // Act
    const sorties = executer(["--json", `--depot=${depot}`]);

    // Assert
    const charge = JSON.parse(sorties[0]);
    expect(charge.total).toMatchObject({ fichiers: 2, code: 3, commentaire: 1, taux: 25 });
  });

  it("should print a JSON payload detailing each directory when --json is passed", () => {
    const depot = creerDepot({ "src/module.ts": TEMOIN, "server/api.js": TEMOIN });

    const sorties = executer(["--json", `--depot=${depot}`]);

    const charge = JSON.parse(sorties[0]);
    expect(charge.repertoires).toEqual([
      { repertoire: "server", fichiers: 1, code: 1, commentaire: 1, mixte: 0, taux: 50 },
      { repertoire: "src", fichiers: 1, code: 1, commentaire: 1, mixte: 0, taux: 50 },
    ]);
  });

  it("should print a JSON payload stating the definition and the thresholds when --json is passed", () => {
    const depot = creerDepot({ "src/module.ts": TEMOIN });

    const sorties = executer(["--json", `--depot=${depot}`]);

    const charge = JSON.parse(sorties[0]);
    expect(charge).toMatchObject({
      definition: expect.stringContaining("commentaires / (code + commentaires)"),
      seuils: { min: 8, max: 15 },
      perimetre: { racines: ["src", "server"], profondeur_regroupement: 3 },
      verdict: expect.any(String),
      genere_le: expect.any(String),
    });
  });

  it("should print a readable table holding the total row when no flag is passed", () => {
    const depot = creerDepot({ "src/module.ts": TEMOIN });

    const sorties = executer([`--depot=${depot}`]);

    expect(sorties.join("\n")).toContain("TOTAL");
  });

  it("should print the global rate and its verdict when no flag is passed", () => {
    const depot = creerDepot({ "src/module.ts": TEMOIN });

    const sorties = executer([`--depot=${depot}`]);

    expect(sorties.join("\n")).toContain("Taux global : 50.00 %");
  });

  it("should print the missing comment count when the rate is below the range", () => {
    const depot = creerDepot({ "src/brut.ts": "export const A = 1;\nexport const B = 2;" });

    const sorties = executer([`--depot=${depot}`]);

    expect(sorties.join("\n")).toContain("il manque environ 1 lignes de commentaire");
  });

  it("should print no remediation hint when the rate is above the range", () => {
    const depot = creerDepot({ "src/riche.ts": "// Un.\n// Deux.\n// Trois.\nexport const A = 1;" });

    const sorties = executer([`--depot=${depot}`]);

    expect(sorties.join("\n")).not.toContain("il manque environ");
  });
});
