import { hostParent } from "./support/tripScreenMocks";

import React from "react";
import { Alert, Image, Share } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import TripActionsScreen from "../TripActionsScreen";
import { lightColors, darkColors } from "../../contexts/ThemeContext";

// On renvoie la clé de traduction plutôt que le libellé : les assertions restent
// lisibles et insensibles aux retouches de wording.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUseRoute = jest.fn();
const mockUseTheme = jest.fn();
const mockUseNetwork = jest.fn();

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockDeleteTrip = jest.fn();
const mockGetLink = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useRoute: () => mockUseRoute(),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, dispatch: mockDispatch }),
  // `CommonActions.reset` produit une action opaque : on la rend inspectable
  // pour affirmer que la pile est bien réinitialisée sur l'écran principal.
  CommonActions: { reset: (config: unknown) => ({ type: "RESET", payload: config }) },
}));

jest.mock("../../contexts/TripsContext", () => ({ useTrips: () => ({ deleteTrip: mockDeleteTrip }) }));
jest.mock("../../contexts/NetworkContext", () => ({ useNetwork: () => mockUseNetwork() }));
jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: () => mockUseTheme(),
}));

jest.mock("../../services/ApiService", () => ({
  __esModule: true,
  default: { getTripInvitationLink: (...args: unknown[]) => mockGetLink(...args) },
}));

// `formatDate` délègue à `Intl` via la locale i18next : on le fige pour que le
// sous-titre du bandeau ne dépende ni de la langue ni du fuseau de la machine.
jest.mock("../../utils/i18n", () => ({
  formatDate: (date: Date, options?: Record<string, unknown>) =>
    options?.year ? `${date.toISOString().slice(0, 10)}+y` : date.toISOString().slice(0, 10),
  parseApiError: (error: unknown) => (error as { message?: string })?.message ?? "",
}));

type AlertButton = { text?: string; style?: string; onPress?: () => void | Promise<void> };

const ROUTE_PARAMS = {
  tripId: "t1",
  tripTitle: "Pérou 2026",
  destination: "Lima",
  startDate: "2026-03-15T12:00:00.000Z",
  endDate: "2026-03-25T12:00:00.000Z",
  coverImage: "https://cdn/lima.jpg",
  totalBookings: 3,
  totalAddresses: 5,
  isOwner: true,
};

const renderScreen = (params: Partial<typeof ROUTE_PARAMS> = {}) => {
  mockUseRoute.mockReturnValue({ params: { ...ROUTE_PARAMS, ...params } });
  return render(<TripActionsScreen />);
};

/** Récupère les boutons passés au dernier `Alert.alert`. */
const lastAlertButtons = (alert: jest.SpyInstance): AlertButton[] =>
  (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];

describe("TripActionsScreen", () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockUseTheme.mockReturnValue({ colors: lightColors, isDark: false });
    mockUseNetwork.mockReturnValue({ isConnected: true });
    mockGetLink.mockResolvedValue({ link: "https://mtc/invite/abc" });
    mockDeleteTrip.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("bandeau de couverture", () => {
    it("should show the trip title and its destination with the formatted dates", () => {
      // Arrange & Act
      renderScreen();

      // Assert
      expect(screen.getByText("Pérou 2026")).toBeTruthy();
      expect(screen.getByText("📍 Lima · 2026-03-15 – 2026-03-25+y")).toBeTruthy();
    });

    it("should display the cover photo when the trip has one", () => {
      // Arrange & Act
      renderScreen();

      // Assert
      expect(screen.UNSAFE_getByType(Image).props.source).toEqual({ uri: "https://cdn/lima.jpg" });
    });

    it("should fall back to a plain backdrop when the trip has no cover photo", () => {
      // Arrange & Act
      renderScreen({ coverImage: undefined });

      // Assert
      expect(screen.UNSAFE_queryAllByType(Image)).toHaveLength(0);
      expect(screen.getByTestId("gradient:rgba(0,0,0,0.10)/rgba(0,0,0,0.72)")).toBeTruthy();
    });

    it("should go back when the back button is pressed", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("statistiques", () => {
    it("should show the bookings and addresses counters received from the route", () => {
      // Arrange & Act
      renderScreen();

      // Assert
      expect(screen.getByText("3")).toBeTruthy();
      expect(screen.getByText("5")).toBeTruthy();
      expect(screen.getByText("tripActions.statsBookings")).toBeTruthy();
      expect(screen.getByText("tripActions.statsAddresses")).toBeTruthy();
    });
  });

  describe("menu d'actions", () => {
    it("should open the edit screen when the edit row is pressed", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByText("tripActions.editTrip"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("EditTrip", { tripId: "t1" });
    });

    it("should open the invitation screen when the members row is pressed", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByText("tripActions.manageMembers"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("InviteFriends", { tripId: "t1" });
    });

    it("should hide the owner-only rows when the viewer is not the owner", () => {
      // Arrange & Act
      renderScreen({ isOwner: false });

      // Assert
      expect(screen.queryByText("tripActions.manageMembers")).toBeNull();
      expect(screen.queryByText("tripActions.deleteTrip")).toBeNull();
      expect(screen.getByText("tripActions.editTrip")).toBeTruthy();
      expect(screen.getByText("tripActions.shareTrip")).toBeTruthy();
    });

    it("should tint the members icon with the dark palette when the dark theme is active", () => {
      // Arrange
      mockUseTheme.mockReturnValue({ colors: darkColors, isDark: true });

      // Act
      renderScreen();

      // Assert
      expect(hostParent(screen.getByText("👥"))).toHaveStyle({ backgroundColor: "#1A2E35" });
    });

    it("should tint the members icon with the light palette when the light theme is active", () => {
      // Arrange & Act
      renderScreen();

      // Assert
      expect(hostParent(screen.getByText("👥"))).toHaveStyle({ backgroundColor: "#DCF0F5" });
    });
  });

  describe("partage du voyage", () => {
    it("should share the invitation link returned by the API", async () => {
      // Arrange
      const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
      renderScreen();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("tripActions.shareTrip"));
      });

      // Assert
      expect(mockGetLink).toHaveBeenCalledWith("t1");
      expect(share).toHaveBeenCalledWith({
        message: "tripActions.shareMessage",
        url: "https://mtc/invite/abc",
      });
    });

    it("should log the failure without crashing when the link cannot be fetched", async () => {
      // Arrange
      const error = jest.spyOn(console, "error").mockImplementation(() => {});
      const failure = new Error("passerelle indisponible");
      mockGetLink.mockRejectedValue(failure);
      renderScreen();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("tripActions.shareTrip"));
      });

      // Assert
      expect(error).toHaveBeenCalledWith("[TripActionsScreen] share error", failure);
      expect(screen.getByText("Pérou 2026")).toBeTruthy();
    });
  });

  describe("suppression du voyage", () => {
    const confirmDeletion = async () => {
      fireEvent.press(screen.getByText("tripActions.deleteTrip"));
      await act(async () => {
        await lastAlertButtons(alert)[1].onPress?.();
      });
    };

    it("should ask for confirmation before deleting the trip", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByText("tripActions.deleteTrip"));

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "tripActions.deleteConfirmTitle",
        "tripActions.deleteConfirmMsg",
        expect.any(Array),
      );
      expect(mockDeleteTrip).not.toHaveBeenCalled();
    });

    it("should offer a cancel option that deletes nothing", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByText("tripActions.deleteTrip"));

      // Assert
      expect(lastAlertButtons(alert)[0]).toMatchObject({ text: "common.cancel", style: "cancel" });
      expect(mockDeleteTrip).not.toHaveBeenCalled();
    });

    it("should reset the navigation stack on the main screen once the trip is deleted", async () => {
      // Arrange
      renderScreen();

      // Act
      await confirmDeletion();

      // Assert
      expect(mockDeleteTrip).toHaveBeenCalledWith("t1");
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "RESET",
        payload: { index: 0, routes: [{ name: "Main" }] },
      });
    });

    it("should surface the API message when the deletion fails", async () => {
      // Arrange
      mockDeleteTrip.mockRejectedValue(new Error("voyage verrouillé"));
      renderScreen();

      // Act
      await confirmDeletion();

      // Assert
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(alert).toHaveBeenLastCalledWith("common.error", "voyage verrouillé");
    });

    it("should fall back to a generic message when the failure carries no text", async () => {
      // Arrange
      mockDeleteTrip.mockRejectedValue(new Error(""));
      renderScreen();

      // Act
      await confirmDeletion();

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "tripActions.deleteError");
    });
  });

  describe("mode hors ligne", () => {
    it("should disable the deletion row when the device is offline", () => {
      // Arrange
      mockUseNetwork.mockReturnValue({ isConnected: false });
      renderScreen();

      // Act
      fireEvent.press(screen.getByText("tripActions.deleteTrip"));

      // Assert
      expect(alert).not.toHaveBeenCalled();
    });

    it("should keep the deletion row active when the device is online", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByText("tripActions.deleteTrip"));

      // Assert
      expect(alert).toHaveBeenCalledTimes(1);
    });
  });
});
