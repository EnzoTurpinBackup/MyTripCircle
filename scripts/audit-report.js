#!/usr/bin/env node
/**
 * Transforme la sortie JSON de `npm audit` en tableau Markdown.
 *
 * Utilisé par la CI pour publier un rapport lisible dans le résumé du job
 * sans faire échouer le run : la barrière bloquante est l'étape
 * `npm audit --audit-level=critical` qui la précède.
 *
 * Usage : npm audit --json | node scripts/audit-report.js
 */

const SEVERITY_ORDER = ["critical", "high", "moderate", "low", "info"];
const REPORTED_SEVERITIES = new Set(["critical", "high"]);

/** Le flux est passé en paramètre pour rester testable hors d'un vrai stdin. */
function readStream(stream) {
  return new Promise((resolve, reject) => {
    let raw = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => (raw += chunk));
    stream.on("end", () => resolve(raw));
    stream.on("error", reject);
  });
}

/** Titres des advisories rattachés directement à un paquet (hors dépendances). */
function directAdvisories(vulnerability) {
  return vulnerability.via
    .filter((via) => typeof via === "object")
    .map((via) => via.title);
}

/** Correctif proposé par npm, tel qu'affiché dans la colonne du rapport. */
function formatFix(fixAvailable) {
  if (fixAvailable === true) return "`npm audit fix`";
  if (!fixAvailable) return "aucun";

  const major = fixAvailable.isSemVerMajor ? " (majeure)" : "";
  return `${fixAvailable.name}@${fixAvailable.version}${major}`;
}

/** Sans advisory direct, le paquet n'est signalé que par transitivité. */
function formatOrigin(vulnerability) {
  const advisories = directAdvisories(vulnerability);
  return advisories.length > 0 ? advisories.join("<br>") : "transitif";
}

function formatSummary(counts) {
  const detail = SEVERITY_ORDER.filter((severity) => counts[severity] > 0)
    .map((severity) => `${counts[severity]} ${severity}`)
    .join(" · ");

  return detail
    ? `**${counts.total} vulnérabilité(s)** — ${detail}`
    : "Aucune vulnérabilité connue ✅";
}

function buildReport(audit) {
  const lines = ["## Audit des dépendances", "", formatSummary(audit.metadata.vulnerabilities)];

  const packages = Object.values(audit.vulnerabilities)
    .filter((vulnerability) => REPORTED_SEVERITIES.has(vulnerability.severity))
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  if (packages.length === 0) return lines.join("\n");

  lines.push(
    "",
    "### Vulnérabilités high / critical",
    "",
    "| Paquet | Sévérité | Origine | Correctif amont |",
    "| --- | --- | --- | --- |"
  );

  for (const vulnerability of packages) {
    lines.push(
      `| \`${vulnerability.name}\` | ${vulnerability.severity} | ${formatOrigin(vulnerability)} | ${formatFix(vulnerability.fixAvailable)} |`
    );
  }

  return lines.join("\n");
}

function parseAudit(raw) {
  if (!raw.trim()) {
    throw new Error("Aucune entrée reçue : attend la sortie de `npm audit --json` sur stdin");
  }

  const audit = JSON.parse(raw);
  if (audit.error) {
    throw new Error(`npm audit a échoué : ${audit.error.summary ?? "erreur inconnue"}`);
  }

  return audit;
}

async function render(input, output) {
  const raw = await readStream(input);
  output.write(`${buildReport(parseAudit(raw))}\n`);
}

// Comparaison sur le chemin plutôt que sur le module lui-même : `require.main
// === module` porte sur deux types que l'analyse statique juge disjoints.
if (require.main?.filename === __filename) {
  render(process.stdin, process.stdout).catch((err) => {
    console.error(`[audit-report] ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = { render, readStream, buildReport, parseAudit, formatFix, formatOrigin, formatSummary };
