/**
 * Outils partagés par les tests du lot « voyages » de src/components.
 *
 * Deux contraintes dictent ce module :
 * 1. `useTranslation` renvoie les clés brutes tant qu'aucune instance i18next
 *    n'est initialisée. On force donc l'initialisation réelle (mêmes
 *    dictionnaires que l'application) et la langue « en », pour que les tests
 *    assertent sur des libellés stables quelle que soit la locale de la machine.
 * 2. Les boutons composés uniquement d'une icône Ionicons n'exposent aucun
 *    texte accessible. `pressIcon` cible l'icône par son nom — l'intention du
 *    bouton — plutôt que par sa position dans l'arbre.
 */
import "../../utils/i18n";
import i18next from "i18next";
import { fireEvent, screen } from "@testing-library/react-native";
import type { Address, Booking, Collaborator, Trip } from "../../types";

i18next.changeLanguage("en");

/** Palette minimale attendue par les listes d'édition, qui reçoivent leurs couleurs en props. */
export const listColors = {
  textLight: "#B0A090",
  terraLight: "#F5E5DC",
  terra: "#C4714A",
  surface: "#FFFFFF",
  border: "#D8CCBA",
  bgMid: "#EDE5D8",
  textMid: "#7A6A58",
  dangerLight: "#FDEAEA",
  text: "#2A2318",
};

/**
 * Les icônes sont stubbées en `<Text {...props} />` dans chaque suite : la prop
 * `name` apparaît donc à la fois sur l'élément composite et sur l'élément hôte
 * qu'il rend. On ne garde que les hôtes pour compter une icône une seule fois.
 */
function findIcons(name: string) {
  return screen.UNSAFE_queryAllByProps({ name }).filter((el) => typeof el.type === "string");
}

/** Presse le bouton portant l'icône nommée `name` (occurrence `index`). */
export function pressIcon(name: string, index = 0): void {
  fireEvent.press(findIcons(name)[index]);
}

/** Nombre d'icônes portant ce nom — sert à vérifier l'icône choisie selon le type. */
export function countIcons(name: string): number {
  return findIcons(name).length;
}

export function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "b1",
    tripId: "t1",
    type: "flight",
    title: "Paris → Lima",
    // Midi UTC : la date calendaire reste la même de UTC-11 à UTC+11, donc les
    // libellés formatés ne dépendent pas du fuseau de la machine de test.
    date: new Date("2026-03-15T12:00:00.000Z"),
    ...overrides,
  } as Booking;
}

export function makeAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: "a1",
    tripId: "t1",
    type: "hotel",
    name: "Hôtel Miraflores",
    address: "12 avenida Larco",
    city: "Lima",
    country: "Pérou",
    ...overrides,
  } as Address;
}

export function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "t1",
    ownerId: "u1",
    title: "Pérou 2026",
    destination: "Lima",
    startDate: new Date("2026-03-15T12:00:00.000Z"),
    endDate: new Date("2026-03-25T12:00:00.000Z"),
    status: "active",
    collaborators: [] as Collaborator[],
    ...overrides,
  } as Trip;
}
