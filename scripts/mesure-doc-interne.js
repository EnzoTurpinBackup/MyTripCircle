#!/usr/bin/env node
/**
 * Mesure du taux de documentation interne du code (densité de commentaires).
 *
 * MÉTHODE — définition retenue, opposable et reproductible :
 *   1. Taux = lignes de commentaire / (lignes de code + lignes de commentaire) × 100,
 *      soit la « densité de commentaires » de SonarQube, déjà utilisée sur ce dépôt.
 *   2. Ligne de commentaire = ligne portant du texte de commentaire — de ligne, de bloc
 *      ou JSDoc — contenant au moins un caractère alphanumérique.
 *   3. Ligne de code = ligne portant au moins un caractère significatif hors commentaire.
 *      Une ligne mixte (code + commentaire) compte dans les deux colonnes.
 *   4. Exclus du décompte : lignes vides, lignes de pure décoration (ouvertures, fermetures
 *      et astérisques d'alignement), directives outillage (eslint, ts, prettier, istanbul).
 *   5. Exclus du périmètre : tests (`__tests__`, `*.test.*`, `*.spec.*`), `node_modules`,
 *      `coverage`, `.expo`, `ios/`, `android/`, `dist/`, déclarations `*.d.ts` et
 *      fichiers portant une bannière `@generated`.
 *
 * Le comptage s'appuie sur un automate à états qui distingue commentaires, chaînes,
 * gabarits `` `${}` `` et littéraux d'expression régulière : un `//` situé dans une
 * chaîne ou une URL n'est jamais compté comme un commentaire.
 *
 * Usage :
 *   node scripts/mesure-doc-interne.js              # tableau lisible
 *   node scripts/mesure-doc-interne.js --json       # sortie JSON
 *   node scripts/mesure-doc-interne.js --sans-donnees   # hors jeux de données statiques
 *   node scripts/mesure-doc-interne.js --profondeur=2   # regroupement moins fin
 *   node scripts/mesure-doc-interne.js --depot=/chemin  # mesurer un autre état du dépôt
 *
 * Reproduire la mesure sur un commit donné, sans toucher au répertoire de travail :
 *   mkdir /tmp/etat && git archive <commit> src server | tar -x -C /tmp/etat
 *   node scripts/mesure-doc-interne.js --depot=/tmp/etat
 */

'use strict';

const fs = require('fs');
const path = require('path');

// --- Périmètre paramétrable ------------------------------------------------

/** Racines analysées, relatives à la racine du dépôt. */
const RACINES = ['src', 'server'];

/** Extensions considérées comme du code applicatif. */
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

/** Répertoires ignorés où qu'ils se trouvent dans l'arborescence. */
const REPERTOIRES_EXCLUS = [
  '__tests__',
  '__mocks__',
  'node_modules',
  'coverage',
  '.expo',
  '.git',
  'ios',
  'android',
  'dist',
  'build',
  'web-build',
];

/** Motifs de noms de fichiers ignorés (tests, déclarations de types). */
const FICHIERS_EXCLUS = [/\.test\./, /\.spec\./, /\.d\.ts$/];

/** Jeux de données statiques, retirés du périmètre avec l'option --sans-donnees. */
const REPERTOIRES_DONNEES = ['src/data', 'src/utils/i18n'];

/** Fourchette attendue par le référentiel RNCP 36463 (CDAN). */
const SEUIL_MIN = 8;
const SEUIL_MAX = 15;

/** Profondeur de regroupement par défaut du tableau (`src/services/api` = 3). */
const PROFONDEUR_PAR_DEFAUT = 3;

/** Commentaires adressés à l'outillage, écartés car ils ne documentent pas le code. */
const DIRECTIVES_OUTILLAGE =
  /^\s*(eslint-|@ts-|prettier-|istanbul ignore|globals?\s|jshint|jslint|c8 ignore|v8 ignore|@jest-environment)/;

/** Au moins un caractère alphanumérique, accents inclus : sinon, pure décoration. */
const CARACTERE_SIGNIFIANT = /[0-9A-Za-zÀ-ɏ]/;

/** Mots-clés après lesquels un `/` ouvre une expression régulière, pas une division. */
const MOTS_CLES_AVANT_REGEX = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'throw', 'case', 'do', 'else', 'yield', 'await',
]);

// --- Analyse lexicale d'un fichier -----------------------------------------

/**
 * Parcourt le source caractère par caractère et classe chaque ligne.
 * Retourne le nombre de lignes de code, de commentaire, mixtes et vides.
 */
function analyserSource(source) {
  const lignes = source.split(/\r\n|\r|\n/);
  let etat = 'code';
  // Pile des gabarits : chaque entrée mémorise la profondeur d'accolades à retrouver.
  const pileGabarits = [];
  let profondeurAccolades = 0;
  let precedentSignificatif = '';
  let motPrecedent = '';

  let code = 0;
  let commentaire = 0;
  let mixte = 0;
  let vides = 0;

  for (const ligne of lignes) {
    let aDuCode = false;
    let texteCommentaire = '';
    let i = 0;

    while (i < ligne.length) {
      const c = ligne[i];
      const suivant = ligne[i + 1];

      if (etat === 'commentaire_bloc') {
        if (c === '*' && suivant === '/') {
          etat = 'code';
          i += 2;
          continue;
        }
        texteCommentaire += c;
        i += 1;
        continue;
      }

      if (etat === 'chaine_simple' || etat === 'chaine_double') {
        aDuCode = true;
        if (c === '\\') {
          i += 2;
          continue;
        }
        if ((etat === 'chaine_simple' && c === "'") || (etat === 'chaine_double' && c === '"')) {
          etat = 'code';
        }
        i += 1;
        continue;
      }

      if (etat === 'gabarit') {
        aDuCode = true;
        if (c === '\\') {
          i += 2;
          continue;
        }
        if (c === '`') {
          etat = 'code';
          i += 1;
          continue;
        }
        if (c === '$' && suivant === '{') {
          pileGabarits.push(profondeurAccolades);
          profondeurAccolades += 1;
          etat = 'code';
          i += 2;
          continue;
        }
        i += 1;
        continue;
      }

      if (etat === 'regex') {
        aDuCode = true;
        if (c === '\\') {
          i += 2;
          continue;
        }
        if (c === '[') {
          etat = 'regex_classe';
          i += 1;
          continue;
        }
        if (c === '/') {
          etat = 'code';
          precedentSignificatif = '/';
        }
        i += 1;
        continue;
      }

      if (etat === 'regex_classe') {
        aDuCode = true;
        if (c === '\\') {
          i += 2;
          continue;
        }
        if (c === ']') etat = 'regex';
        i += 1;
        continue;
      }

      // État « code »
      if (c === '/' && suivant === '/' && precedentSignificatif !== ':') {
        texteCommentaire += ligne.slice(i + 2);
        break;
      }
      if (c === '/' && suivant === '*') {
        etat = 'commentaire_bloc';
        i += 2;
        continue;
      }
      if (c === '/' && ouvreUneRegex(precedentSignificatif, motPrecedent)) {
        etat = 'regex';
        aDuCode = true;
        i += 1;
        continue;
      }
      if (c === ' ' || c === '\t') {
        i += 1;
        continue;
      }

      aDuCode = true;
      if (c === "'") etat = 'chaine_simple';
      else if (c === '"') etat = 'chaine_double';
      else if (c === '`') etat = 'gabarit';
      else if (c === '{') profondeurAccolades += 1;
      else if (c === '}') {
        profondeurAccolades -= 1;
        if (pileGabarits.length > 0 && pileGabarits[pileGabarits.length - 1] === profondeurAccolades) {
          pileGabarits.pop();
          etat = 'gabarit';
        }
      }

      motPrecedent = /[A-Za-z_$]/.test(c)
        ? (/[\w$]/.test(precedentSignificatif) ? motPrecedent + c : c)
        : '';
      precedentSignificatif = c;
      i += 1;
    }

    // Filet de sécurité : ni une chaîne simple ni une expression régulière ne
    // franchit une fin de ligne en JavaScript. Si l'automate s'y trouve encore,
    // c'est une fausse détection : on la borne à la ligne au lieu de la propager.
    if (etat === 'regex' || etat === 'regex_classe' || etat === 'chaine_simple' || etat === 'chaine_double') {
      etat = 'code';
    }

    const aDuCommentaire =
      CARACTERE_SIGNIFIANT.test(texteCommentaire) && !DIRECTIVES_OUTILLAGE.test(texteCommentaire);

    if (aDuCode) code += 1;
    if (aDuCommentaire) commentaire += 1;
    if (aDuCode && aDuCommentaire) mixte += 1;
    if (!aDuCode && !aDuCommentaire) vides += 1;
  }

  return { code, commentaire, mixte, vides, total: lignes.length };
}

/**
 * Décide si un `/` rencontré en état « code » ouvre une expression régulière.
 * Les caractères `<` et `}` sont traités comme des non-ouvertures : en JSX ils
 * précèdent une balise fermante (`</Text>`) ou une division entre accolades,
 * jamais un littéral d'expression régulière.
 */
function ouvreUneRegex(precedent, mot) {
  if (precedent === '') return true;
  if (MOTS_CLES_AVANT_REGEX.has(mot)) return true;
  return !/[\w$)\]}<]/.test(precedent);
}

// --- Parcours du périmètre -------------------------------------------------

/** Liste récursivement les fichiers de code du répertoire, exclusions appliquées. */
function collecterFichiers(racineDepot, relatif, fichiers) {
  const absolu = path.join(racineDepot, relatif);
  if (!fs.existsSync(absolu)) return fichiers;

  for (const entree of fs.readdirSync(absolu, { withFileTypes: true })) {
    const cheminRelatif = path.posix.join(relatif, entree.name);
    if (entree.isDirectory()) {
      if (REPERTOIRES_EXCLUS.includes(entree.name)) continue;
      collecterFichiers(racineDepot, cheminRelatif, fichiers);
      continue;
    }
    if (!EXTENSIONS.includes(path.extname(entree.name))) continue;
    if (FICHIERS_EXCLUS.some((motif) => motif.test(entree.name))) continue;
    fichiers.push(cheminRelatif);
  }
  return fichiers;
}

/** Un fichier estampillé `@generated` dans son en-tête sort du périmètre. */
function estGenere(source) {
  return /@generated\b|AUTO-GENERATED|Code généré automatiquement/i.test(source.slice(0, 800));
}

/** Réduit un chemin de fichier au répertoire de regroupement du tableau. */
function repertoireDeRegroupement(cheminRelatif, profondeur) {
  const segments = path.posix.dirname(cheminRelatif).split('/');
  if (profondeur <= 0) return segments.join('/');
  return segments.slice(0, profondeur).join('/');
}

/** Densité de commentaires en pourcentage, arrondie au centième. */
function calculerTaux(code, commentaire) {
  const denominateur = code + commentaire;
  if (denominateur === 0) return 0;
  return Math.round((commentaire / denominateur) * 10000) / 100;
}

// --- Programme principal ---------------------------------------------------

function lireOptions(argv) {
  const profondeurBrute = argv.find((a) => a.startsWith('--profondeur='));
  const depotBrut = argv.find((a) => a.startsWith('--depot='));
  return {
    json: argv.includes('--json'),
    sansDonnees: argv.includes('--sans-donnees'),
    profondeur: profondeurBrute ? Number(profondeurBrute.split('=')[1]) : PROFONDEUR_PAR_DEFAUT,
    depot: depotBrut ? path.resolve(depotBrut.slice('--depot='.length)) : null,
  };
}

function mesurer(racineDepot, options) {
  const fichiers = RACINES.flatMap((racine) => collecterFichiers(racineDepot, racine, []));
  const parRepertoire = new Map();
  const global = { fichiers: 0, code: 0, commentaire: 0, mixte: 0, vides: 0, ignores: 0 };

  // Tri explicite par chaîne : l'ordre de parcours n'influe pas sur les totaux,
  // mais il rend la sortie stable d'une machine à l'autre (règle Sonar S2871).
  for (const cheminRelatif of fichiers.sort((a, b) => a.localeCompare(b))) {
    if (options.sansDonnees && REPERTOIRES_DONNEES.some((d) => cheminRelatif.startsWith(`${d}/`))) {
      global.ignores += 1;
      continue;
    }
    const source = fs.readFileSync(path.join(racineDepot, cheminRelatif), 'utf8');
    if (estGenere(source)) {
      global.ignores += 1;
      continue;
    }

    const mesure = analyserSource(source);
    const cle = repertoireDeRegroupement(cheminRelatif, options.profondeur);
    const cumul = parRepertoire.get(cle) || { repertoire: cle, fichiers: 0, code: 0, commentaire: 0, mixte: 0 };
    cumul.fichiers += 1;
    cumul.code += mesure.code;
    cumul.commentaire += mesure.commentaire;
    cumul.mixte += mesure.mixte;
    parRepertoire.set(cle, cumul);

    global.fichiers += 1;
    global.code += mesure.code;
    global.commentaire += mesure.commentaire;
    global.mixte += mesure.mixte;
    global.vides += mesure.vides;
  }

  const repertoires = [...parRepertoire.values()]
    .map((r) => ({ ...r, taux: calculerTaux(r.code, r.commentaire) }))
    .sort((a, b) => b.code - a.code || a.repertoire.localeCompare(b.repertoire));

  const taux = calculerTaux(global.code, global.commentaire);
  return {
    genere_le: new Date().toISOString(),
    definition:
      'commentaires / (code + commentaires) x 100, lignes vides et de decoration exclues, tests hors perimetre',
    perimetre: {
      depot: racineDepot,
      racines: RACINES,
      extensions: EXTENSIONS,
      repertoires_exclus: REPERTOIRES_EXCLUS,
      donnees_statiques_exclues: options.sansDonnees,
      profondeur_regroupement: options.profondeur,
    },
    seuils: { min: SEUIL_MIN, max: SEUIL_MAX },
    repertoires,
    total: { ...global, taux },
    verdict: rendreVerdict(taux),
  };
}

function rendreVerdict(taux) {
  if (taux < SEUIL_MIN) return 'sous la fourchette';
  if (taux > SEUIL_MAX) return 'au-dessus de la fourchette';
  return 'dans la fourchette';
}

function formaterTableau(resultat) {
  const lignes = resultat.repertoires.map((r) => [
    r.repertoire,
    String(r.fichiers),
    String(r.code),
    String(r.commentaire),
    `${r.taux.toFixed(2)} %`,
  ]);
  const entetes = ['Répertoire', 'Fichiers', 'Code', 'Commentaires', 'Taux'];
  const totalLigne = [
    'TOTAL',
    String(resultat.total.fichiers),
    String(resultat.total.code),
    String(resultat.total.commentaire),
    `${resultat.total.taux.toFixed(2)} %`,
  ];

  const largeurs = entetes.map((entete, colonne) =>
    Math.max(entete.length, ...[...lignes, totalLigne].map((l) => l[colonne].length))
  );
  const formater = (cellules) =>
    cellules
      .map((valeur, colonne) =>
        colonne === 0 ? valeur.padEnd(largeurs[colonne]) : valeur.padStart(largeurs[colonne])
      )
      .join('  ');
  const separateur = largeurs.map((l) => '-'.repeat(l)).join('  ');

  return [formater(entetes), separateur, ...lignes.map(formater), separateur, formater(totalLigne)].join('\n');
}

function afficher(resultat) {
  const { total, seuils } = resultat;
  console.log('Taux de documentation interne — MyTripCircle');
  console.log(`Définition : ${resultat.definition}`);
  console.log(`Périmètre  : ${RACINES.join(', ')} (hors tests)`);
  console.log('');
  console.log(formaterTableau(resultat));
  console.log('');
  console.log(
    `Lignes mixtes (code + commentaire sur la même ligne) : ${total.mixte} — comptées des deux côtés.`
  );
  console.log(`Lignes vides ou de décoration écartées : ${total.vides}.`);
  console.log('');
  console.log(
    `Taux global : ${total.taux.toFixed(2)} % — fourchette référentiel ${seuils.min}–${seuils.max} % : ${resultat.verdict.toUpperCase()}.`
  );
  if (resultat.verdict !== 'dans la fourchette') {
    const cible = Math.ceil((seuils.min / 100) * total.code / (1 - seuils.min / 100));
    const ecart = cible - total.commentaire;
    if (ecart > 0) {
      console.log(
        `Pour atteindre ${seuils.min} %, il manque environ ${ecart} lignes de commentaire à volume de code constant.`
      );
    }
  }
}

function principal() {
  const options = lireOptions(process.argv.slice(2));
  const racineDepot = options.depot || path.resolve(__dirname, '..');
  const resultat = mesurer(racineDepot, options);

  if (options.json) {
    console.log(JSON.stringify(resultat, null, 2));
    return;
  }
  afficher(resultat);
}

if (require.main === module) {
  principal();
}

module.exports = { analyserSource, calculerTaux, mesurer, lireOptions, principal };
