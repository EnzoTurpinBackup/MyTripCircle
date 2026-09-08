/**
 * Contexte de thème — palette claire ou sombre, et style de fond de carte.
 *
 * Le thème est global par nature : chaque composant qui dessine lit la même palette, et
 * basculer depuis les réglages doit repeindre l'application entière, pas seulement l'écran
 * ouvert. Passer les couleurs en propriétés reviendrait à les faire traverser tout l'arbre.
 *
 * Consommateurs : la quasi-totalité des écrans et des composants, via `useTheme`.
 *
 * Réinitialisation : aucune. Contrairement aux autres contextes, celui-ci ne dépend pas de
 * la session — c'est une préférence d'appareil, pas de compte. Elle survit à la déconnexion,
 * et deux comptes utilisés sur le même appareil partagent le même thème.
 *
 * Garanties : entièrement local, donc insensible à la perte de réseau et à l'expiration de
 * session. La lecture du choix persisté étant asynchrone, la première frame est rendue avec
 * le thème du système ; si le choix stocké diffère, un bref changement de palette est visible
 * au lancement. Une préférence absente n'est pas un défaut mais un mode à part entière : tant
 * que l'utilisateur n'a pas basculé manuellement, l'application suit le thème du système.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@mytripcircle_dark_mode";
const SATELLITE_KEY = "@mytripcircle_satellite_map";

// ─── Palettes ─────────────────────────────────────────────────────────────────
/**
 * Palette du thème clair. Sert aussi de référence de forme : la palette sombre doit en
 * reprendre exactement les clés, faute de quoi un composant lirait `undefined` en mode
 * sombre — le typage de `AppColors` en fait une contrainte de compilation.
 */
export const lightColors = {
  // Fonds
  bg: "#F5F0E8",
  bgLight: "#FDFAF5",
  bgMid: "#EDE5D8",
  bgDark: "#D8CCBA",
  // Cartes / surfaces
  surface: "#FFFFFF",
  surfaceSecondary: "#FDFAF5",
  // Bordures
  border: "#D8CCBA",
  borderLight: "#EDE5D8",
  // Piste de l'interrupteur à l'état éteint. Jeton distinct de `border` :
  // WCAG 1.4.11 exige 3:1 entre un composant d'interface et son fond pour
  // qu'il soit perceptible, or `border` ne donne que 1,4:1 sur `bg` dans les
  // deux thèmes — la piste éteinte y disparaît, ne laissant que le bouton
  // blanc. `border` reste inchangé, il sert à toutes les bordures.
  toggleTrackOff: "#7A6A58",
  // Texte
  text: "#2A2318",
  textMid: "#7A6A58",
  textLight: "#B0A090",
  // Accent terracotta
  terra: "#C4714A",
  terraLight: "#F5E5DC",
  terraDark: "#A35830",
  // États
  danger: "#C04040",
  dangerLight: "#FDEAEA",
  // Divers
  white: "#FFFFFF",
  statusBar: "dark-content" as "dark-content" | "light-content",
};

/**
 * Palette du thème sombre. L'accent terracotta est conservé à l'identique pour préserver
 * l'identité de l'application, mais ses déclinaisons claire et foncée sont inversées : sur
 * fond sombre, c'est la variante foncée qui doit être la plus lumineuse pour rester lisible.
 */
export const darkColors = {
  // Fonds
  bg: "#1A1714",
  bgLight: "#201D1A",
  bgMid: "#262220",
  bgDark: "#2E2A27",
  // Cartes / surfaces
  surface: "#262220",
  surfaceSecondary: "#2E2A27",
  // Bordures
  border: "#3A3530",
  borderLight: "#302C28",
  // Piste de l'interrupteur à l'état éteint. Jeton distinct de `border` :
  // WCAG 1.4.11 exige 3:1 entre un composant d'interface et son fond pour
  // qu'il soit perceptible, or `border` ne donne que 1,4:1 sur `bg` dans les
  // deux thèmes — la piste éteinte y disparaît, ne laissant que le bouton
  // blanc. `border` reste inchangé, il sert à toutes les bordures.
  toggleTrackOff: "#7A6A58",
  // Texte
  text: "#F0E8DC",
  textMid: "#A89880",
  textLight: "#7A6A58",
  // Accent terracotta (identique)
  terra: "#C4714A",
  terraLight: "#3D2418",
  terraDark: "#E08060",
  // États
  danger: "#E05050",
  dangerLight: "#2E1818",
  // Divers
  white: "#FFFFFF",
  statusBar: "light-content" as "dark-content" | "light-content",
};

export type AppColors = typeof lightColors;

// ─── Context ──────────────────────────────────────────────────────────────────
interface ThemeContextType {
  isDark: boolean;
  colors: AppColors;
  toggleTheme: () => void;
  satelliteMap: boolean;
  toggleSatelliteMap: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
  satelliteMap: false,
  toggleSatelliteMap: () => {},
});

/**
 * Donne accès à la palette courante et aux bascules de préférence.
 *
 * Ne lève pas hors provider, contrairement aux autres contextes de l'application : le
 * défaut du contexte est une palette claire complète et des bascules inertes. Un composant
 * isolé — cellule rendue dans un test, aperçu — doit pouvoir se dessiner sans provider, et
 * un thème par défaut est un mode dégradé acceptable là où une session absente ne l'est pas.
 *
 * @returns `isDark`, la palette `colors`, et les bascules de thème et de fond de carte.
 */
export const useTheme = () => useContext(ThemeContext);

// ─── Provider ─────────────────────────────────────────────────────────────────
/**
 * Fournit la palette à l'arbre React et arbitre entre préférence manuelle et thème système.
 *
 * La règle tient dans la valeur stockée : son absence signifie « suivre le système », et
 * c'est pourquoi le second effet la relit à chaque changement de thème système au lieu de
 * s'appuyer sur `isDark`. Une bascule manuelle écrit la valeur et fige ce suivi
 * définitivement — l'application ne propose pas de revenir au mode automatique.
 */
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === "dark");
  const [satelliteMap, setSatelliteMap] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === null) {
        // Pas de préférence manuelle → suivre le thème système
        setIsDark(systemScheme === "dark");
      } else {
        setIsDark(val === "true");
      }
    });
    AsyncStorage.getItem(SATELLITE_KEY).then((val) => {
      if (val !== null) setSatelliteMap(val === "true");
    });
  }, []);

  // Suivre les changements système si l'utilisateur n'a pas de préférence manuelle
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === null) setIsDark(systemScheme === "dark");
    });
  }, [systemScheme]);

  /**
   * Bascule entre thème clair et sombre et enregistre le choix.
   *
   * L'état est mis à jour à partir de sa valeur précédente, et l'écriture persistée lancée
   * sans être attendue : la palette doit changer à la frame suivante, pas au retour du
   * stockage. Un échec d'écriture n'est pas rattrapé — la bascule reste effective pour la
   * session et se perdra au redémarrage.
   */
  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  /**
   * Bascule le fond de carte entre plan et vue satellite.
   *
   * Rangée avec le thème parce qu'il s'agit de la même nature de donnée — une préférence
   * d'affichage propre à l'appareil, sans lien avec le compte — et qu'elle est consommée par
   * les mêmes écrans que la palette. Sa clé de stockage reste distincte.
   */
  const toggleSatelliteMap = () => {
    setSatelliteMap((prev) => {
      const next = !prev;
      AsyncStorage.setItem(SATELLITE_KEY, String(next));
      return next;
    });
  };

  const ctxValue = useMemo(
    () => ({ isDark, colors: isDark ? darkColors : lightColors, toggleTheme, satelliteMap, toggleSatelliteMap }),
    [isDark, satelliteMap, toggleTheme, toggleSatelliteMap],
  );

  return (
    <ThemeContext.Provider value={ctxValue}>
      {children}
    </ThemeContext.Provider>
  );
};
