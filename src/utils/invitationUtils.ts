import i18n from "./i18n";

/** Onglets de l'écran d'invitations : toutes, reçues en attente, envoyées. */
export type TabKey = "all" | "pending" | "sent";

/**
 * Choisit le dégradé de la bannière d'une invitation, par hachage d'une graine.
 *
 * Tirage déterministe pour que la même invitation garde son apparence d'un rafraîchissement
 * à l'autre : une couleur redistribuée à chaque rendu donnerait l'illusion que la liste a
 * changé. Le hachage est borné à un octet à chaque tour, ce qui suffit à répartir cinq
 * palettes et écarte tout débordement sur une graine longue.
 *
 * @param seed Chaîne discriminante — en pratique l'identifiant de l'invitation ou le nom du
 * voyage. Une graine vide rend la première palette, sans erreur.
 * @returns Les couleurs de début et de fin du dégradé.
 */
export function getBannerGradient(seed: string): readonly [string, string] {
  const palettes: readonly (readonly [string, string])[] = [
    ["#5A8FAA", "#2A5F7F"],
    ["#C4714A", "#8B4513"],
    ["#6B8C5A", "#3D5C2A"],
    ["#8B70C0", "#5C3D90"],
    ["#C0A040", "#8B7020"],
  ] as const;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + (seed.codePointAt(i) ?? 0)) & 0xff;
  return palettes[h % palettes.length];
}

/**
 * Exprime l'ancienneté d'une invitation en langage relatif.
 *
 * Les paliers s'élargissent avec l'ancienneté — minutes, heures, jours, semaines, mois : à
 * mesure qu'un événement s'éloigne, la précision devient du bruit. Le dernier n'est pas
 * borné, un « il y a 14 mois » est donc possible.
 *
 * @param raw Date de création, objet ou chaîne analysable.
 * @returns Le libellé traduit du palier atteint.
 *
 * @remarks Deux cas limites ne sont pas rattrapés et doivent être écartés par l'appelant.
 * Une date future donne un écart négatif, qui passe sous le premier palier et rend « à
 * l'instant ». Une date non analysable donne un écart `NaN`, qui échoue toutes les
 * comparaisons et atteint le dernier palier, affichant un décompte `NaN`.
 */
export function formatRelative(raw: string | Date): string {
  const diff = Date.now() - new Date(raw).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return i18n.t("invitation.timeAgoJustNow");
  const h = Math.floor(m / 60);
  if (h < 24) return i18n.t("invitation.timeAgoHours", { count: h });
  const d = Math.floor(h / 24);
  if (d < 7) return i18n.t("invitation.timeAgoDays", { count: d });
  if (d < 30) return i18n.t("invitation.timeAgoWeeks", { count: Math.floor(d / 7) });
  return i18n.t("invitation.timeAgoMonths", { count: Math.floor(d / 30) });
}

/**
 * Met en forme la période d'un voyage sur une seule ligne.
 *
 * Seule la date de fin porte l'année : la répéter aux deux extrémités allongerait la ligne
 * sans rien apprendre dans l'immense majorité des cas. Un voyage à cheval sur deux années
 * n'affiche donc que l'année d'arrivée — limite acceptée au profit de la compacité.
 *
 * @param start Date de début.
 * @param end Date de fin.
 * @returns La période, séparée par un tiret demi-cadratin.
 *
 * @remarks Aucune validation : une date non analysable est rendue telle que la plateforme la
 * met en forme, soit « Invalid Date » inséré dans la ligne. Pas de repli traduit ici,
 * contrairement à `formatDate`.
 */
export function formatDateRange(start: string | Date, end: string | Date): string {
  const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
  const s = new Date(start);
  const e = new Date(end);
  const sFmt = s.toLocaleDateString(locale, { day: "numeric", month: "short" });
  const eFmt = e.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  return `${sFmt} – ${eFmt}`;
}

/**
 * Calcule la durée d'un voyage en jours.
 *
 * L'écart est arrondi au plus proche et non tronqué : les dates portent souvent une heure, et
 * tronquer amputerait d'un jour un séjour de deux jours et vingt-trois heures. Le plancher à
 * un jour couvre l'aller-retour dans la journée, d'écart nul, et les périodes inversées.
 *
 * @param start Date de début.
 * @param end Date de fin.
 * @returns Le nombre de jours, au minimum 1.
 *
 * @remarks Une date non analysable rend `NaN`, que le plancher n'intercepte pas — `NaN`
 * n'étant supérieur à rien. L'affichage devient alors « NaN jours ».
 *
 * @example
 * tripDuration("2026-05-01", "2026-05-01"); // 1 — plancher, et non 0
 * tripDuration("2026-05-10", "2026-05-01"); // 1 — période inversée, ramenée au plancher
 */
export function tripDuration(start: string | Date, end: string | Date): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(diff / 86_400_000));
}
