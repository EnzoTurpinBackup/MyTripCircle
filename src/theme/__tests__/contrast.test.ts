jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import { lightColors, darkColors } from "../../contexts/ThemeContext";

/**
 * Vérifie le critère WCAG 1.4.11 « Contraste des éléments non textuels » sur les
 * jetons qui portent la perception d'un composant d'interface.
 *
 * Ce critère ne concerne pas la lisibilité d'un texte mais la capacité à
 * distinguer un contrôle de son fond : un interrupteur dont la piste se confond
 * avec la page n'est pas perçu comme un interrupteur.
 */

/** Luminance relative d'une couleur hexadécimale, au sens WCAG 2.1. */
const luminance = (hex: string): number => {
  const canaux = [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = canaux.map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
};

/** Rapport de contraste entre deux couleurs, de 1:1 à 21:1. */
const contraste = (a: string, b: string): number => {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (sombre + 0.05);
};

const SEUIL_NON_TEXTUEL = 3;

describe("contraste des composants d'interface (WCAG 1.4.11)", () => {
  it("should reach the non-text threshold for the light theme toggle track when off", () => {
    const { toggleTrackOff, bg } = lightColors;
    const ratio = contraste(toggleTrackOff, bg);
    expect(ratio).toBeGreaterThanOrEqual(SEUIL_NON_TEXTUEL);
  });

  it("should reach the non-text threshold for the dark theme toggle track when off", () => {
    const { toggleTrackOff, bg } = darkColors;
    const ratio = contraste(toggleTrackOff, bg);
    expect(ratio).toBeGreaterThanOrEqual(SEUIL_NON_TEXTUEL);
  });

  it("should reach the non-text threshold for the light theme toggle track when on", () => {
    const { terra, bg } = lightColors;
    const ratio = contraste(terra, bg);
    expect(ratio).toBeGreaterThanOrEqual(SEUIL_NON_TEXTUEL);
  });

  it("should reach the non-text threshold for the dark theme toggle track when on", () => {
    const { terra, bg } = darkColors;
    const ratio = contraste(terra, bg);
    expect(ratio).toBeGreaterThanOrEqual(SEUIL_NON_TEXTUEL);
  });

  it("should fail the threshold when the generic border token is used as a track", () => {
    // Le jeton `border` a été écarté pour cette raison précise : ce test échoue
    // si quelqu'un le rebranche un jour sur la piste de l'interrupteur.
    const { border, bg } = lightColors;
    const ratio = contraste(border, bg);
    expect(ratio).toBeLessThan(SEUIL_NON_TEXTUEL);
  });

  it("should compute a known reference ratio when comparing black and white", () => {
    const ratio = contraste("#FFFFFF", "#000000");
    expect(ratio).toBeCloseTo(21, 1);
  });
});
