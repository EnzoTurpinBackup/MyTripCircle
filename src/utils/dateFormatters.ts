import i18n from "i18next";

/**
 * Met en forme une date pour l'affichage, dans la langue courante de l'application.
 *
 * Cette fonction est le seul point de passage des dates vers l'écran, et c'est à ce titre
 * qu'elle absorbe les cas dégradés plutôt que de les propager : une date manquante ou
 * illisible venue du serveur doit produire un libellé traduit, jamais `"Invalid Date"` ni
 * une exception au milieu d'un rendu de liste.
 *
 * Trois cas limites sont distingués, et l'ordre compte : l'absence de date — `null`,
 * `undefined`, mais aussi la chaîne vide, qui est falsy — rend le libellé « non
 * disponible » ; une date présente mais non analysable rend le libellé « date invalide » ;
 * un échec de la mise en forme elle-même, par exemple sur des options malformées, retombe
 * sur ce même libellé après journalisation.
 *
 * @param date Date à mettre en forme, sous forme d'objet ou de chaîne analysable.
 * @param options Options de mise en forme surchargeant le format court par défaut.
 * @returns La date mise en forme, ou un libellé traduit — jamais une chaîne vide.
 *
 * @example
 * formatDate(null);            // « Date non disponible »
 * formatDate("");              // « Date non disponible » — la chaîne vide est une absence
 * formatDate("pas une date");  // « Date invalide »
 */
export const formatDate = (
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
) => {
  if (!date) return i18n.t("common.dateNotAvailable");

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (Number.isNaN(dateObj.getTime())) {
      return i18n.t("common.invalidDate");
    }

    const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
    const defaultOptions: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };

    return dateObj.toLocaleDateString(locale, { ...defaultOptions, ...options });
  } catch (error) {
    console.error("Error formatting date:", error);
    return i18n.t("common.invalidDate");
  }
};

/**
 * Met en forme une date en format long, jour de la semaine et mois en toutes lettres.
 *
 * Simple préréglage de `formatDate`, dont il hérite intégralement le traitement des cas
 * limites : une date absente ou invalide rend le même libellé traduit, sans forme longue.
 *
 * @param date Date à mettre en forme.
 * @returns La date en format long, ou un libellé traduit.
 */
export const formatDateLong = (date: Date | string | null | undefined) =>
  formatDate(date, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

/**
 * Met en forme une heure saisie au format `HH:MM`, en affichage 24 heures.
 *
 * L'heure est portée sur la date du jour avant d'être remise en forme : c'est le seul moyen
 * d'obtenir la ponctuation propre à chaque langue sans la coder en dur. L'affichage reste sur
 * 24 heures dans toutes les langues, les heures de vol et de train étant écrites ainsi sur
 * les billets, y compris anglophones.
 *
 * Le repli diffère de celui des dates : une heure absente rend la chaîne vide, parce qu'elle
 * est facultative sur une réservation et qu'un libellé « non disponible » alourdirait la
 * carte pour rien.
 *
 * @param time Heure au format `HH:MM`, éventuellement absente.
 * @returns L'heure mise en forme ; la chaîne vide si l'entrée est absente ou vide ; l'entrée
 * telle quelle si la mise en forme lève.
 *
 * @remarks Une chaîne présente mais malformée n'est pas rattrapée : les composants d'heure
 * sont alors `NaN`, la date construite est invalide, et la mise en forme rend le libellé
 * système « Invalid Date » sans lever. Le repli sur l'entrée brute ne couvre donc pas ce cas.
 */
export const formatTime = (time: string | null | undefined) => {
  if (!time) return "";

  try {
    const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(Number.parseInt(hours), Number.parseInt(minutes));

    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    return time;
  }
};

