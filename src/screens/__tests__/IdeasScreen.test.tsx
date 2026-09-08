import { mockDatePicker, resetDatePicker } from "./support/uiMocks";

import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import IdeasScreen from "../IdeasScreen";
import { useIdeas } from "../../hooks/useIdeas";
import { freezeClockAt, restoreClock } from "../../components/invitations/__tests__/frozenClock";

const mockNavigate = jest.fn();

// `src/utils/i18n` — tiré par `ItineraryModal` — branche `initReactI18next` sur
// i18next au chargement : la doublure doit donc l'exposer.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Le geste de navigation entre onglets repose sur `react-native-gesture-handler` :
// il n'apporte rien au rendu et son détecteur natif n'est pas monté en test.
jest.mock("../../hooks/useSwipeToNavigate", () => ({
  SwipeToNavigate: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../hooks/useIdeas", () => ({ useIdeas: jest.fn() }));

const mockUseIdeas = useIdeas as jest.Mock;

// `onShowCreateStep` appelle `new Date()` : l'horloge est figée pour que
// l'assertion sur la date de départ proposée soit reproductible.
const NOW = new Date("2026-03-01T09:00:00.000Z");
const START_DATE = new Date("2026-04-10T00:00:00.000Z");

const CATEGORIES = [
  { id: "all", label: "Toutes" },
  { id: "beach", label: "Plage" },
  { id: "city", label: "Ville" },
];

const DESTINATIONS = [
  { id: "1", category: "beach", image: "https://example.test/tulum.jpg", name: "Tulum", country: "Mexique" },
  { id: "7", category: "city", image: "https://example.test/tokyo.jpg", name: "Tokyo", country: "Japon" },
];

const ITINERARY = {
  city: "Lisbonne",
  days: [
    { day: 1, title: "Alfama", morning: { activity: "Tramway 28" }, afternoon: null, evening: null },
  ],
};

const handlers = {
  setSearch: jest.fn(),
  setActiveCategory: jest.fn(),
  openModal: jest.fn(),
  closeModal: jest.fn(),
  setCityInput: jest.fn(),
  setDaysInput: jest.fn(),
  setShowCreateStep: jest.fn(),
  setStartDate: jest.fn(),
  setShowDatePicker: jest.fn(),
  generateItinerary: jest.fn(),
  handleCreateTrip: jest.fn(),
  resetItinerary: jest.fn(),
};

interface HookOverrides {
  search?: string;
  activeCategory?: string;
  modalVisible?: boolean;
  cityInput?: string;
  daysInput?: string;
  loading?: boolean;
  itinerary?: typeof ITINERARY | null;
  showCreateStep?: boolean;
  showDatePicker?: boolean;
  creating?: boolean;
  filtered?: typeof DESTINATIONS;
}

const setupHook = (overrides: HookOverrides = {}) => {
  const {
    search = "",
    activeCategory = "all",
    modalVisible = false,
    cityInput = "Lisbonne",
    daysInput = "1",
    loading = false,
    itinerary = null,
    showCreateStep = false,
    showDatePicker = false,
    creating = false,
    filtered = DESTINATIONS,
  } = overrides;

  mockUseIdeas.mockReturnValue({
    search,
    setSearch: handlers.setSearch,
    activeCategory,
    setActiveCategory: handlers.setActiveCategory,
    modalVisible,
    openModal: handlers.openModal,
    closeModal: handlers.closeModal,
    cityInput,
    setCityInput: handlers.setCityInput,
    daysInput,
    setDaysInput: handlers.setDaysInput,
    loading,
    itinerary,
    showCreateStep,
    setShowCreateStep: handlers.setShowCreateStep,
    startDate: START_DATE,
    setStartDate: handlers.setStartDate,
    showDatePicker,
    setShowDatePicker: handlers.setShowDatePicker,
    creating,
    DESTINATIONS,
    CATEGORIES,
    filtered,
    generateItinerary: handlers.generateItinerary,
    handleCreateTrip: handlers.handleCreateTrip,
    resetItinerary: handlers.resetItinerary,
  });
};

describe("IdeasScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDatePicker();
    freezeClockAt(NOW);
    setupHook();
  });

  afterEach(() => {
    restoreClock();
  });

  describe("catalogue de destinations", () => {
    it("should list every destination returned by the hook", () => {
      // Arrange & Act
      render(<IdeasScreen />);

      // Assert
      expect(screen.getByText("Tulum")).toBeTruthy();
      expect(screen.getByText("Tokyo")).toBeTruthy();
    });

    it("should show an empty message when no destination matches", () => {
      // Arrange
      setupHook({ filtered: [] });

      // Act
      render(<IdeasScreen />);

      // Assert
      expect(screen.getByText("ideas.noResults")).toBeTruthy();
    });

    it("should open the destination details when a card is pressed", () => {
      // Arrange
      render(<IdeasScreen />);

      // Act
      fireEvent.press(screen.getByText("Tulum"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("IdeaDetail", { ideaId: "1" });
    });
  });

  describe("recherche", () => {
    it("should forward the typed search to the hook", () => {
      // Arrange
      render(<IdeasScreen />);

      // Act
      fireEvent.changeText(screen.getByPlaceholderText("ideas.searchPlaceholder"), "Tok");

      // Assert
      expect(handlers.setSearch).toHaveBeenCalledWith("Tok");
    });

    it("should hide the clear button while the search is empty", () => {
      // Arrange & Act
      render(<IdeasScreen />);

      // Assert
      expect(screen.queryByText("icon:close-circle")).toBeNull();
    });

    it("should clear the search when the clear button is pressed", () => {
      // Arrange
      setupHook({ search: "Tok" });
      render(<IdeasScreen />);

      // Act
      fireEvent.press(screen.getByText("icon:close-circle"));

      // Assert
      expect(handlers.setSearch).toHaveBeenCalledWith("");
    });
  });

  describe("catégories", () => {
    it("should display every category chip", () => {
      // Arrange & Act
      render(<IdeasScreen />);

      // Assert
      expect(screen.getByText("Plage")).toBeTruthy();
    });

    it("should select the pressed category", () => {
      // Arrange
      render(<IdeasScreen />);

      // Act
      fireEvent.press(screen.getByText("Ville"));

      // Assert
      expect(handlers.setActiveCategory).toHaveBeenCalledWith("city");
    });

    it("should highlight the active category in white", () => {
      // Arrange
      setupHook({ activeCategory: "city" });

      // Act
      render(<IdeasScreen />);

      // Assert
      const active = Object.assign({}, ...[screen.getByText("Ville").props.style].flat(Infinity));
      const inactive = Object.assign({}, ...[screen.getByText("Plage").props.style].flat(Infinity));
      expect(active.color).toBe("#FFFFFF");
      expect(inactive.color).not.toBe("#FFFFFF");
    });
  });

  describe("assistant d'itinéraire", () => {
    it("should open the assistant when the sparkle button is pressed", () => {
      // Arrange
      render(<IdeasScreen />);

      // Act
      fireEvent.press(screen.getByText("✦"));

      // Assert
      expect(handlers.openModal).toHaveBeenCalledTimes(1);
    });

    it("should keep the assistant closed while the hook says so", () => {
      // Arrange & Act
      render(<IdeasScreen />);

      // Assert
      expect(screen.queryByPlaceholderText("ideas.itinerary.cityPlaceholder")).toBeNull();
    });

    it("should forward the typed city to the hook", () => {
      // Arrange
      setupHook({ modalVisible: true, cityInput: "" });
      render(<IdeasScreen />);

      // Act
      fireEvent.changeText(screen.getByPlaceholderText("ideas.itinerary.cityPlaceholder"), "Porto");

      // Assert
      expect(handlers.setCityInput).toHaveBeenCalledWith("Porto");
    });

    it("should ask the hook to generate the itinerary", () => {
      // Arrange
      setupHook({ modalVisible: true });
      render(<IdeasScreen />);

      // Act
      fireEvent.press(screen.getByText("ideas.itinerary.generate"));

      // Assert
      expect(handlers.generateItinerary).toHaveBeenCalledTimes(1);
    });

    it("should start the creation step on today's date", () => {
      // Arrange
      setupHook({ modalVisible: true, itinerary: ITINERARY });
      render(<IdeasScreen />);

      // Act
      fireEvent.press(screen.getByText("ideas.itinerary.createTrip"));

      // Assert
      expect(handlers.setStartDate).toHaveBeenCalledWith(NOW);
      expect(handlers.setShowCreateStep).toHaveBeenCalledWith(true);
    });

    it("should leave the creation step when the back button is pressed", () => {
      // Arrange
      setupHook({ modalVisible: true, itinerary: ITINERARY, showCreateStep: true });
      render(<IdeasScreen />);

      // Act
      fireEvent.press(screen.getByText("ideas.itinerary.back"));

      // Assert
      expect(handlers.setShowCreateStep).toHaveBeenCalledWith(false);
    });

    it("should forward the confirmed start date to the hook", () => {
      // Arrange
      setupHook({
        modalVisible: true,
        itinerary: ITINERARY,
        showCreateStep: true,
        showDatePicker: true,
      });
      render(<IdeasScreen />);
      act(() => {
        mockDatePicker.onChange?.({}, NOW);
      });

      // Act
      fireEvent.press(screen.getByText("common.confirm"));

      // Assert
      expect(handlers.setStartDate).toHaveBeenCalledWith(NOW);
      expect(handlers.setShowDatePicker).toHaveBeenCalledWith(false);
    });

    it("should ask the hook to create the trip from the itinerary", () => {
      // Arrange
      setupHook({ modalVisible: true, itinerary: ITINERARY, showCreateStep: true });
      render(<IdeasScreen />);

      // Act
      fireEvent.press(screen.getByText("ideas.itinerary.createTrip"));

      // Assert
      expect(handlers.handleCreateTrip).toHaveBeenCalledTimes(1);
    });

    it("should restart a new search when asked", () => {
      // Arrange
      setupHook({ modalVisible: true, itinerary: ITINERARY });
      render(<IdeasScreen />);

      // Act
      fireEvent.press(screen.getByText("ideas.itinerary.newSearch"));

      // Assert
      expect(handlers.resetItinerary).toHaveBeenCalledTimes(1);
    });
  });
});
