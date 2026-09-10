import i18n from "./i18n";

/**
 * Exprime l'ancienneté d'une notification en langage relatif.
 *
 * Paliers plus fins que ceux des invitations — les minutes sont conservées et la veille a son
 * libellé propre : une notification est consultée peu après son arrivée, où « il y a
 * 12 minutes » est plus informatif qu'un arrondi à l'heure.
 *
 * @param raw Date d'émission, sous forme de chaîne analysable.
 * @returns Le libellé traduit du palier atteint, ou le repli traduit de date invalide.
 *
 * @remarks Mêmes garde-fous que le format relatif des invitations (défaut D-12) : une date
 * non analysable rend `common.invalidDate`, une date future est bornée à « à l'instant ».
 * Le dernier palier n'est pas plafonné — une notification ancienne affiche son nombre de
 * jours, sans bascule vers les semaines ou les mois.
 */
export const timeAgo = (raw: string): string => {
  const time = new Date(raw).getTime();
  if (Number.isNaN(time)) return i18n.t("common.invalidDate");
  const diff = Math.max(0, Date.now() - time);
  const m = Math.floor(diff / 60000);
  if (m < 1)  return i18n.t("notifications.timeAgo.justNow");
  if (m < 60) return i18n.t("notifications.timeAgo.minutes", { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return i18n.t("notifications.timeAgo.hours", { count: h });
  const d = Math.floor(h / 24);
  if (d === 1) return i18n.t("notifications.timeAgo.yesterday");
  return i18n.t("notifications.timeAgo.days", { count: d });
};

/**
 * Choisit l'emoji et le fond de la pastille d'une notification, selon le statut de
 * l'invitation qu'elle concerne.
 *
 * @param status Statut de l'invitation. Chaîne libre et non type énuméré, délibérément : ces
 * notifications proviennent aussi de charges utiles push, non typées à la frontière.
 * @returns L'emoji et sa couleur de fond. Tout statut autre qu'accepté ou refusé — « en
 * attente », mais aussi une valeur inconnue ou absente — rend la pastille d'invitation
 * reçue, de très loin le cas le plus fréquent.
 */
export const iconForStatus = (status: string): { emoji: string; bg: string } => {
  if (status === "accepted") return { emoji: "✅", bg: "#E2EDD9" };
  if (status === "declined") return { emoji: "❌", bg: "#FDEAEA" };
  return { emoji: "✈️", bg: "#F5E5DC" };
};

/**
 * Compose le titre d'une notification d'invitation.
 *
 * Le nom de l'invitant est cherché à deux emplacements, les invitations arrivant par deux
 * chemins : aplaties dans une charge utile push, imbriquées dans une entité chargée depuis
 * l'API. Uniformiser en amont supposerait de typer la charge push, dont la forme est fixée
 * par le service d'envoi.
 *
 * @param inv Invitation, sous l'une ou l'autre de ces formes.
 * @returns Le titre traduit, interpolé avec le nom de l'invitant. Faute de nom, un libellé
 * impersonnel traduit prend sa place : le titre reste une phrase complète, jamais trouée.
 */
export const titleForInvitation = (inv: any): string => {
  const inviter = inv.inviterName ?? inv.inviter?.name ?? i18n.t("invitation.someoneRef");
  if (inv.status === "accepted") return i18n.t("notifications.inviteAccepted", { inviter });
  if (inv.status === "declined") return i18n.t("notifications.inviteDeclined", { inviter });
  return i18n.t("notifications.inviteReceived", { inviter });
};

/**
 * Compose le sous-titre d'une notification : nom du voyage et date.
 *
 * Le nom du voyage est cherché à trois emplacements — champ aplati, puis titre ou nom de
 * l'entité imbriquée, ces deux dernières formes ayant coexisté au fil des versions du schéma.
 * Une invitation ancienne reste ainsi lisible.
 *
 * @param inv Invitation, sous l'une ou l'autre de ces formes.
 * @param date Date déjà mise en forme par l'appelant, seul à maîtriser le format voulu.
 * @returns Le nom du voyage suivi de la date, ou la date seule faute de nom — le séparateur
 * médian disparaît alors avec lui, au lieu d'ouvrir la ligne.
 */
export const subtitleForInvitation = (inv: any, date: string): string => {
  const trip = inv.tripName ?? inv.trip?.title ?? inv.trip?.name ?? "";
  return trip ? `${trip} · ${date}` : date;
};
