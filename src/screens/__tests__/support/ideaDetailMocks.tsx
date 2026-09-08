/**
 * Frontières partagées par les suites d'`IdeaDetailScreen`.
 *
 * L'écran n'est qu'une vue : toute sa logique vit dans `useIdeaDetail`, couvert
 * ailleurs. On remplace donc le hook et on pilote le rendu par sa valeur de
 * retour. À importer EN PREMIER pour que les `jest.mock` précèdent le
 * chargement de l'écran.
 */

import { Animated } from "react-native";

import "./uiMocks";

import { lightColors } from "../../../contexts/ThemeContext";
import { useIdeaDetail } from "../../../hooks/useIdeaDetail";
import type { TripIdea } from "../../../data/tripIdeas";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../../../hooks/useIdeaDetail", () => ({ useIdeaDetail: jest.fn() }));

const mockUseIdeaDetail = useIdeaDetail as jest.Mock;

export const IDEA: TripIdea = {
  id: "1",
  duration: 3,
  difficulty: "moderate",
  destinationCity: "Tulum",
  destinationCountry: "Mexico",
  highlightsFr: ["Cénotes turquoise", "Ruines mayas"],
  highlightsEn: ["Turquoise cenotes", "Mayan ruins"],
  itinerary: [
    { day: 1, titleFr: "Arrivée", titleEn: "Arrival", activitiesFr: ["Plage"], activitiesEn: ["Beach"] },
    { day: 2, titleFr: "Cénotes", titleEn: "Cenotes", activitiesFr: ["Plongée"], activitiesEn: ["Diving"] },
    { day: 3, titleFr: "Départ", titleEn: "Departure", activitiesFr: ["Marché"], activitiesEn: ["Market"] },
  ],
  suggestedBookings: [],
};

// L'écran n'affiche aucune date qu'il calcule lui-même : celles-ci sont figées
// et remontées telles quelles par le hook, ce qui rend les suites indépendantes
// de l'horloge.
export const START_DATE = new Date("2026-04-10T00:00:00.000Z");
export const END_DATE = new Date("2026-04-12T00:00:00.000Z");
export const PICKED_DATE = new Date("2026-05-01T00:00:00.000Z");

/** Libellé rendu par `formatDate` pour `START_DATE`. */
export const START_DATE_LABEL = "date:2026-04-10";

export const handlers = {
  goBack: jest.fn(),
  changeCustomDays: jest.fn(),
  setStartDate: jest.fn(),
  setShowDatePicker: jest.fn(),
  setTripTitle: jest.fn(),
  openModal: jest.fn(),
  closeModal: jest.fn(),
  handleCreate: jest.fn(),
  formatDate: jest.fn((d: Date) => `date:${d.toISOString().slice(0, 10)}`),
};

interface HookOverrides {
  idea?: TripIdea;
  lang?: string;
  customDays?: number;
  modalVisible?: boolean;
  showDatePicker?: boolean;
  creating?: boolean;
  tripTitle?: string;
}

/** Réarme la doublure du hook ; à appeler dans chaque `beforeEach`. */
export const setupHook = (overrides: HookOverrides = {}) => {
  // `undefined` est une valeur significative ici (idée introuvable) : la
  // présence de la clé prime donc sur la valeur par défaut.
  const idea = "idea" in overrides ? overrides.idea : IDEA;
  const {
    lang = "fr",
    customDays = 3,
    modalVisible = false,
    showDatePicker = false,
    creating = false,
    tripTitle = "Tulum – Mexique",
  } = overrides;

  mockUseIdeaDetail.mockReturnValue({
    navigation: { goBack: handlers.goBack },
    idea,
    lang,
    colors: lightColors,
    isDark: false,
    t: (key: string) => key,
    destinationName: "Tulum",
    destinationCountry: "Mexique",
    customDays,
    changeCustomDays: handlers.changeCustomDays,
    startDate: START_DATE,
    setStartDate: handlers.setStartDate,
    endDate: END_DATE,
    showDatePicker,
    setShowDatePicker: handlers.setShowDatePicker,
    modalVisible,
    tripTitle,
    setTripTitle: handlers.setTripTitle,
    creating,
    backdropOpacity: new Animated.Value(1),
    sheetTranslateY: new Animated.Value(0),
    openModal: handlers.openModal,
    closeModal: handlers.closeModal,
    handleCreate: handlers.handleCreate,
    formatDate: handlers.formatDate,
  });
};

/** Dernier modificateur de durée passé à `changeCustomDays`. */
export const lastDaysUpdater = () =>
  handlers.changeCustomDays.mock.calls.at(-1)?.[0] as (prev: number) => number;
