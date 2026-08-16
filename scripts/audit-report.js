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

function readStdin() {
  return new Promise((resolve, reject) => {
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", () => resolve(raw));
    process.stdin.on("error", reject);
  });
}

/** Titres des advisories rattachés directement à un paquet (hors dépendances). */
function directAdvisories(vulnerability) {
  return vulnerability.via
    .filter((via) => typeof via === "object")
    .map((via) => via.title);
}

function buildReport(audit) {
  const counts = audit.metadata.vulnerabilities;
  const lines = ["## Audit des dépendances", ""];

  const summary = SEVERITY_ORDER.filter((severity) => counts[severity] > 0)
    .map((severity) => `${counts[severity]} ${severity}`)
    .join(" · ");
  lines.push(summary ? `**${counts.total} vulnérabilité(s)** — ${summary}` : "Aucune vulnérabilité connue ✅");

  const packages = Object.values(audit.vulnerabilities)
    .filter((vulnerability) => ["critical", "high"].includes(vulnerability.severity))
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  if (packages.length === 0) return lines.join("\n");

  lines.push("", "### Vulnérabilités high / critical", "", "| Paquet | Sévérité | Origine | Correctif amont |", "| --- | --- | --- | --- |");

  for (const vulnerability of packages) {
    const advisories = directAdvisories(vulnerability);
    // Sans advisory direct, le paquet n'est signalé que par transitivité.
    const origin = advisories.length > 0 ? advisories.join("<br>") : "transitif";
    const fix = vulnerability.fixAvailable === true
      ? "`npm audit fix`"
      : vulnerability.fixAvailable
        ? `${vulnerability.fixAvailable.name}@${vulnerability.fixAvailable.version}${vulnerability.fixAvailable.isSemVerMajor ? " (majeure)" : ""}`
        : "aucun";
    lines.push(`| \`${vulnerability.name}\` | ${vulnerability.severity} | ${origin} | ${fix} |`);
  }

  return lines.join("\n");
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) {
    throw new Error("Aucune entrée reçue : attend la sortie de `npm audit --json` sur stdin");
  }

  const audit = JSON.parse(raw);
  if (audit.error) {
    throw new Error(`npm audit a échoué : ${audit.error.summary ?? "erreur inconnue"}`);
  }

  process.stdout.write(`${buildReport(audit)}\n`);
}

main().catch((err) => {
  console.error(`[audit-report] ${err.message}`);
  process.exitCode = 1;
});
