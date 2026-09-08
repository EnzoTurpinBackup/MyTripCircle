import "./support/tripScreenMocks";

import React from "react";
import { Image } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import TripsScreen from "../TripsScreen";
import { lightColors } from "../../contexts/ThemeContext";
import { freezeClockAt, restoreClock } from "../../components/invitations/__tests__/frozenClock";
import type { Trip } from "../../types";

// On renvoie la clé de traduction plutôt que le libellé : les assertions restent
// lisibles et insensibles aux retouches de wording.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockNavigate = jest.fn();
const mockRefreshData = jest.fn();
const mockUseTrips = jest.fn();
const mockUseAuth = jest.fn();
const mockUseNetwork = jest.fn();
const mockGetCachedDestinationPhoto = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  // `useFocusEffect` n'est qu'un `useEffect` dont la dépendance est le callback
  // mémoïsé : le rejouer tel quel suffit à déclencher le rafraîchissement.
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = require("react");
    useEffect(callback, [callback]);
  },
}));

jest.mock("../../contexts/TripsContext", () => ({ useTrips: () => mockUseTrips() }));
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("../../contexts/NetworkContext", () => ({ useNetwork: () => mockUseNetwork() }));
jest.mock("../../contexts/ThemeContext", () => {
  const actual = jest.requireActual("../../contexts/ThemeContext");
  return { ...actual, useTheme: () => ({ colors: actual.lightColors, isDark: false }) };
});

// La photo de destination est une frontière réseau (Google Places).
jest.mock("../../utils/destinationPhoto", () => ({
  getCachedDestinationPhoto: (...args: unknown[]) => mockGetCachedDestinationPhoto(...args),
}));

// Les libellés de statut et le compte à rebours sont calculés depuis
// « maintenant » : on fige l'horloge pour les rendre déterministes, sans
// toucher à l'ordonnancement asynchrone dont dépend le chargement des icônes.
const NOW = new Date("2026-03-01T12:00:00.000Z");

const makeTrip = (overrides: Partial<Trip> = {}): Trip =>
  ({
    id: "t1",
    ownerId: "u1",
    title: "Pérou 2026",
    destination: "Lima",
    startDate: new Date("2026-03-15T12:00:00.000Z"),
    endDate: new Date("2026-03-25T12:00:00.000Z"),
    status: "active",
    collaborators: [],
    ...overrides,
  }) as Trip;

interface SetupOptions {
  trips?: Trip[];
  loading?: boolean;
  user?: { name?: string } | null;
  isConnected?: boolean;
}

const setup = ({
  trips = [makeTrip()],
  loading = false,
  user = { name: "Enzo Turpin" },
  isConnected = true,
}: SetupOptions = {}) => {
  mockUseTrips.mockReturnValue({ trips, loading, refreshData: mockRefreshData });
  mockUseAuth.mockReturnValue({ user });
  mockUseNetwork.mockReturnValue({ isConnected });
};

const renderScreen = async () => {
  const view = render(<TripsScreen />);
  // Laisse la récupération asynchrone des photos de destination se résoudre.
  await act(async () => {});
  return view;
};

describe("TripsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    freezeClockAt(NOW);
    mockGetCachedDestinationPhoto.mockResolvedValue(null);
    setup();
  });

  afterEach(() => {
    restoreClock();
  });

  describe("chargement", () => {
    it("should show the skeleton instead of the trips while the data is loading", async () => {
      // Arrange
      setup({ loading: true });

      // Act
      await renderScreen();

      // Assert
      expect(screen.queryByText("trips.header")).toBeNull();
      expect(screen.queryByText("Pérou 2026")).toBeNull();
    });

    it("should refresh the data when the screen gains focus", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(mockRefreshData).toHaveBeenCalledTimes(1);
    });
  });

  describe("en-tête", () => {
    it("should greet the user with the first word of their name", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("trips.greeting")).toBeTruthy();
      expect(screen.getByText("trips.header")).toBeTruthy();
    });

    it("should still render the greeting when no user is signed in", async () => {
      // Arrange
      setup({ user: null });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("trips.greeting")).toBeTruthy();
    });

    it("should still render the greeting when the user has no name", async () => {
      // Arrange
      setup({ user: {} });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("trips.greeting")).toBeTruthy();
    });

    it("should open the creation screen when the add button is pressed", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("icon:add"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("CreateTrip");
    });
  });

  describe("liste vide", () => {
    it("should show the empty state when every trip is already over", async () => {
      // Arrange
      setup({
        trips: [
          makeTrip({
            id: "past",
            startDate: new Date("2026-01-01T12:00:00.000Z"),
            endDate: new Date("2026-01-10T12:00:00.000Z"),
          }),
        ],
      });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("trips.emptyTitle")).toBeTruthy();
      expect(screen.getByText("trips.emptySubtitle")).toBeTruthy();
      expect(screen.queryByText("trips.upcomingTrips")).toBeNull();
    });

    it("should offer the creation card from the empty state", async () => {
      // Arrange
      setup({ trips: [] });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("trips.newButton"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("CreateTrip");
    });
  });

  describe("voyage mis en avant", () => {
    it("should feature the trip already under way over the closest upcoming one", async () => {
      // Arrange
      const ongoing = makeTrip({
        id: "ongoing",
        title: "Islande en cours",
        startDate: new Date("2026-02-25T12:00:00.000Z"),
        endDate: new Date("2026-03-05T12:00:00.000Z"),
      });
      const upcoming = makeTrip({ id: "soon", title: "Pérou à venir" });
      setup({ trips: [upcoming, ongoing] });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("trips.statusActive")).toBeTruthy();
      expect(screen.getByText("Islande en cours")).toBeTruthy();
    });

    it("should feature the closest upcoming trip when none has started yet", async () => {
      // Arrange
      const later = makeTrip({
        id: "later",
        title: "Japon",
        startDate: new Date("2026-06-01T12:00:00.000Z"),
        endDate: new Date("2026-06-20T12:00:00.000Z"),
      });
      setup({ trips: [later, makeTrip({ id: "soon", title: "Pérou 2026" })] });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("trips.statusUpcoming")).toBeTruthy();
      expect(screen.getByText("14j")).toBeTruthy();
    });

    it("should clamp the countdown to zero for a trip that has already started", async () => {
      // Arrange
      setup({
        trips: [
          makeTrip({
            startDate: new Date("2026-02-20T12:00:00.000Z"),
            endDate: new Date("2026-03-10T12:00:00.000Z"),
          }),
        ],
      });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("0j")).toBeTruthy();
    });

    it("should open the trip details when the featured card is pressed", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("Pérou 2026"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("TripDetails", { tripId: "t1" });
    });
  });

  describe("photos de couverture", () => {
    it("should use the cover image stored on the trip when there is one", async () => {
      // Arrange
      setup({ trips: [makeTrip({ coverImage: "https://cdn/cover.jpg" })] });

      // Act
      await renderScreen();

      // Assert
      expect(screen.UNSAFE_getAllByType(Image).some((img) => img.props.source?.uri === "https://cdn/cover.jpg")).toBe(true);
      expect(mockGetCachedDestinationPhoto).not.toHaveBeenCalled();
    });

    it("should fetch a destination photo for a trip that has no cover image", async () => {
      // Arrange
      mockGetCachedDestinationPhoto.mockResolvedValue("https://places/lima.jpg");

      // Act
      await renderScreen();

      // Assert
      expect(mockGetCachedDestinationPhoto).toHaveBeenCalledWith("Lima");
      await waitFor(() => {
        expect(
          screen.UNSAFE_getAllByType(Image).some((img) => img.props.source?.uri === "https://places/lima.jpg"),
        ).toBe(true);
      });
    });

    it("should fall back to a stock photo when no destination photo is found", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(
        screen.UNSAFE_getAllByType(Image).some((img) => String(img.props.source?.uri).includes("unsplash")),
      ).toBe(true);
    });

    it("should skip trips without a destination", async () => {
      // Arrange
      setup({ trips: [makeTrip({ destination: "" })] });

      // Act
      await renderScreen();

      // Assert
      expect(mockGetCachedDestinationPhoto).not.toHaveBeenCalled();
    });

    it("should not fetch the same destination photo twice across renders", async () => {
      // Arrange
      mockGetCachedDestinationPhoto.mockResolvedValue("https://places/lima.jpg");
      const trip = makeTrip();
      const { rerender } = await renderScreen();

      // Act — nouvelle référence de tableau : l'effet est rejoué à l'identique.
      mockUseTrips.mockReturnValue({
        trips: [trip],
        loading: false,
        refreshData: mockRefreshData,
      });
      await act(async () => {
        rerender(<TripsScreen />);
      });

      // Assert
      expect(mockGetCachedDestinationPhoto).toHaveBeenCalledTimes(1);
    });
  });

  describe("bascule « tout afficher »", () => {
    const TRIPS = [
      makeTrip({ id: "hero", title: "Pérou 2026" }),
      makeTrip({
        id: "second",
        title: "Islande",
        startDate: new Date("2026-04-10T12:00:00.000Z"),
        endDate: new Date("2026-04-20T12:00:00.000Z"),
      }),
    ];

    it("should list the remaining trips as a horizontal strip by default", async () => {
      // Arrange
      setup({ trips: TRIPS });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("trips.showAll")).toBeTruthy();
      expect(screen.getByText("Islande")).toBeTruthy();
    });

    it("should open the trip details from a card of the horizontal strip", async () => {
      // Arrange
      setup({ trips: TRIPS });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("Islande"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("TripDetails", { tripId: "second" });
    });

    it("should open the trip details from a row of the expanded list", async () => {
      // Arrange
      setup({ trips: TRIPS });
      await renderScreen();
      fireEvent.press(screen.getByText("trips.showAll"));

      // Act
      fireEvent.press(screen.getByText("Islande"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("TripDetails", { tripId: "second" });
    });

    it("should switch to the expanded list when the toggle is pressed", async () => {
      // Arrange
      setup({ trips: TRIPS });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("trips.showAll"));

      // Assert
      expect(screen.getByText("trips.showLess")).toBeTruthy();
      expect(screen.getByText("Islande")).toBeTruthy();
    });

    it("should collapse the list again when the toggle is pressed twice", async () => {
      // Arrange
      setup({ trips: TRIPS });
      await renderScreen();
      fireEvent.press(screen.getByText("trips.showAll"));

      // Act
      fireEvent.press(screen.getByText("trips.showLess"));

      // Assert
      expect(screen.getByText("trips.showAll")).toBeTruthy();
    });

    it("should still render a trip that carries no identifier", async () => {
      // Arrange
      const anonymous = makeTrip({ id: undefined as unknown as string, title: "Sans identifiant" });
      setup({ trips: [TRIPS[0], anonymous] });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("trips.showAll"));

      // Assert
      expect(screen.getByText("Sans identifiant")).toBeTruthy();
    });
  });

  describe("mode hors ligne", () => {
    it("should disable the add button when the device is offline", async () => {
      // Arrange
      setup({ isConnected: false });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("icon:add"));

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should disable the creation card of the empty state when offline", async () => {
      // Arrange
      setup({ trips: [], isConnected: false });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("trips.newButton"));

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
