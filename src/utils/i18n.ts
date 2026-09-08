import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { ApiService } from "../services/ApiService";
import * as secureStorage from "./secureStorage";
import { resources } from "./i18n/index";

export { formatDate, formatDateLong, formatTime } from "./dateFormatters";
export { parseApiError, getBookingStatusTranslation } from "./errorHandlers";

const LANGUAGE_KEY = "@mytripcircle_language";

/**
 * Change la langue de l'interface, la persiste, et en informe le serveur.
 *
 * Les trois opérations sont volontairement découplées et ordonnées du plus visible au plus
 * accessoire. Le changement en mémoire est immédiat et inconditionnel : c'est le seul effet
 * que l'utilisateur constate. La persistance puis la synchronisation serveur échouent en
 * silence — perdre la préférence au redémarrage ou continuer à recevoir ses e-mails dans
 * l'ancienne langue est une gêne, ne pas changer de langue du tout serait une panne.
 *
 * La synchronisation n'a lieu que si un jeton existe : la langue peut être choisie avant
 * toute connexion, et l'appel serait alors rejeté.
 *
 * @param language Langue cible, parmi celles pour lesquelles un catalogue existe.
 */
export const changeLanguage = async (language: "en" | "fr") => {
  i18n.changeLanguage(language);
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (e) {
    // Erreur de stockage non bloquante — la langue reste changée en mémoire
    if (__DEV__) console.warn("[i18n] Impossible de persister la langue :", e);
  }
  // Sync to server so emails are sent in the user's preferred language
  try {
    const token = await secureStorage.getItem("token");
    if (token) {
      await ApiService.updateLanguage(language);
    }
  } catch (e) {
    // Erreur de sync non bloquante — la préférence locale reste valide
    if (__DEV__) console.warn("[i18n] Impossible de synchroniser la langue :", e);
  }
};

/**
 * Retourne le code de langue actif.
 *
 * @returns Le code tel que la bibliothèque le tient, qui peut être une étiquette régionale
 * (`"fr-CA"`) et non le seul code court : les appelants qui comparent doivent tester le
 * préfixe, non l'égalité.
 */
export const getCurrentLanguage = () => i18n.language;

/**
 * Applique la langue persistée au démarrage de l'application.
 *
 * À appeler une fois au lancement. Ne fait rien si aucune préférence n'a été enregistrée :
 * la langue reste celle de l'appareil, déterminée à l'initialisation ci-dessous. Une valeur
 * stockée hors des langues connues est ignorée de la même façon, ce qui protège d'un
 * catalogue retiré entre deux versions.
 *
 * La synchronisation serveur est ici opportuniste et non attendue : elle rattrape les
 * comptes créés avant que la langue ne soit remontée au serveur, mais retarder le démarrage
 * pour cela serait hors de proportion.
 */
// Initialize language from persisted preference (call on app startup)
export const initLanguage = async () => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved === "en" || saved === "fr") {
      i18n.changeLanguage(saved);
      // Sync the stored preference to the server for existing users who haven't yet
      const token = await secureStorage.getItem("token");
      if (token) {
        ApiService.updateLanguage(saved).catch(() => {
          // Silent — offline or not logged in yet
        });
      }
    }
  } catch (e) {
    // Erreur de stockage non bloquante — la langue reste celle sauvegardée en mémoire
    if (__DEV__) console.warn("[i18n] Impossible de lire la langue sauvegardée :", e);
  }
};

// La langue de l'appareil est lue avec prudence : l'API de localisation peut être absente
// selon la plateforme, et son résultat vide sur un appareil mal configuré. Le code court est
// préféré à l'étiquette régionale, les catalogues n'étant pas déclinés par région.
// Determine device language, fallback to 'en'
const deviceLocales = Localization.getLocales?.();
const deviceLanguage = (() => {
  if (Array.isArray(deviceLocales) && deviceLocales.length > 0) {
    const first = deviceLocales[0] as {
      languageCode?: string | null;
      languageTag?: string | null;
    };
    const fromCode = first.languageCode ?? undefined;
    const fromTag = first.languageTag ? first.languageTag.split("-")[0] : undefined;
    return fromCode || fromTag || "en";
  }
  return "en";
})();

// Initialisation au chargement du module, avant tout rendu : un composant monté sans
// catalogue afficherait ses clés brutes le temps d'une frame. La langue de l'appareil sert
// d'amorce, `initLanguage` la corrigeant ensuite si une préférence a été enregistrée.
// Le repli sur l'anglais couvre les clés absentes d'un catalogue, pas seulement les langues
// non prises en charge : une traduction oubliée s'affiche en anglais plutôt qu'en clé.
i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  keySeparator: ".",
  nsSeparator: false,
});

export default i18n;
