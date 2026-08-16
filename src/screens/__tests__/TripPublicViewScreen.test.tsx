// Branches volontairement non couvertes, toutes inatteignables depuis l'IHM :
//   - l. 73 et 104 : gardes `if (!invitationToken) return;` d'accepter et de
//     refuser. La barre d'invitation qui déclenche ces gestionnaires n'est
//     rendue que si `hasInviteCta`, lequel exige justement un jeton ;
//   - l. 81 et 97 : replis `trip?.title ?? ""` des messages de confirmation.
//     Les deux gestionnaires ne s'exécutent que depuis cette même barre, rendue
//     après le chargement du voyage — l'écran affiche sinon l'avis « accès
//     refusé ».
// Ces quatre gardes défensives ne peuvent être atteintes sans modifier le code
// de production, hors périmètre de ce lot.

import "./support/tripScreenMocks";

import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import TripPublicViewScreen from "../TripPublicViewScreen";
import { freezeClockAt, restoreClock } from "../../components/invitations/__tests__/frozenClock";

// On renvoie la clé de traduction plutôt que le libellé : les assertions restent
// lisibles et insensibles aux retouches de wording.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUseRoute = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRespondToInvitation = jest.fn();
const mockUseAuth = jest.fn();
const mockGetTripById = jest.fn();
const mockGetBookings = jest.fn();
const mockGetAddresses = jest.fn();
const mockReportTrip = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useRoute: () => mockUseRoute(),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock("../../contexts/TripsContext", () => ({
  useTrips: () => ({ respondToInvitation: mockRespondToInvitation }),
}));
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("../../contexts/ThemeContext", () => {
  const actual = jest.requireActual("../../contexts/ThemeContext");
  return { ...actual, useTheme: () => ({ colors: actual.lightColors, isDark: false }) };
});

jest.mock("../../services/ApiService", () => ({
  ApiService: {
    getTripById: (...args: unknown[]) => mockGetTripById(...args),
    getBookingsByTripId: (...args: unknown[]) => mockGetBookings(...args),
    getAddressesByTripId: (...args: unknown[]) => mockGetAddresses(...args),
  },
}));

jest.mock("../../services/api/moderationApi", () => ({
  moderationApi: { reportTrip: (...args: unknown[]) => mockReportTrip(...args) },
}));

// `formatDate` délègue à `Intl` via la locale i18next : on le fige pour que les
// libellés du bandeau ne dépendent ni de la langue ni du fuseau de la machine.
jest.mock("../../utils/i18n", () => ({
  formatDate: (date: string | Date) => new Date(date).toISOString().slice(0, 10),
  parseApiError: (error: unknown) => (error as { message?: string })?.message ?? "",
}));

type AlertButton = { text?: string; style?: string; onPress?: () => void | Promise<void> };

// Le statut du voyage (à venir / en cours / passé) se déduit de « maintenant ».
const NOW = new Date("2026-03-01T12:00:00.000Z");

const OWNER_ID = "owner-1";
const VIEWER_ID = "viewer-1";

const makeTrip = (overrides: Record<string, unknown> = {}) => ({
  id: "t1",
  title: "Pérou 2026",
  destination: "Lima",
  ownerId: OWNER_ID,
  startDate: "2026-03-15T12:00:00.000Z",
  endDate: "2026-03-25T12:00:00.000Z",
  description: "Trek dans la vallée sacrée",
  collaborators: [{ userId: "c1" }, { userId: "c2" }],
  ...overrides,
});

interface SetupOptions {
  trip?: Record<string, unknown> | null;
  invitationToken?: string;
  userId?: string | null;
  bookings?: unknown[];
  addresses?: unknown[];
}

const setup = ({
  trip = makeTrip(),
  invitationToken,
  userId = VIEWER_ID,
  bookings = [],
  addresses = [],
}: SetupOptions = {}) => {
  mockUseRoute.mockReturnValue({ params: { tripId: "t1", invitationToken } });
  mockUseAuth.mockReturnValue({ user: userId ? { id: userId } : null });
  mockGetTripById.mockResolvedValue(trip);
  mockGetBookings.mockResolvedValue(bookings);
  mockGetAddresses.mockResolvedValue(addresses);
};

const renderScreen = async () => {
  const view = render(<TripPublicViewScreen />);
  await act(async () => {});
  return view;
};

/** Récupère les boutons passés au dernier `Alert.alert`. */
const lastAlertButtons = (alert: jest.SpyInstance): AlertButton[] =>
  (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];

describe("TripPublicViewScreen", () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    freezeClockAt(NOW);
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockRespondToInvitation.mockResolvedValue(true);
    mockReportTrip.mockResolvedValue(undefined);
    setup();
  });

  afterEach(() => {
    restoreClock();
    jest.restoreAllMocks();
  });

  describe("chargement", () => {
    it("should show the skeleton before the trip is loaded", async () => {
      // Arrange & Act
      render(<TripPublicViewScreen />);

      // Assert
      expect(screen.queryByText("Pérou 2026")).toBeNull();
      expect(screen.queryByText("tripPublicView.noAccess")).toBeNull();
      // Laisse le chargement se terminer : sans cela, la mise à jour d'état
      // survient hors de tout `act` et pollue la sortie de la suite.
      await act(async () => {});
    });

    it("should show the trip once it is loaded", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("Pérou 2026")).toBeTruthy();
      expect(mockGetTripById).toHaveBeenCalledWith("t1");
    });

    it("should go back when the cover back button is pressed", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("should fall back to empty lists when the bookings and addresses calls fail", async () => {
      // Arrange
      mockGetBookings.mockRejectedValue(new Error("indisponible"));
      mockGetAddresses.mockRejectedValue(new Error("indisponible"));

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("tripPublicView.noBookings")).toBeTruthy();
      expect(screen.getByText("tripPublicView.statBookings")).toBeTruthy();
    });
  });

  describe("voyage inaccessible", () => {
    it("should show a locked notice when the trip cannot be read", async () => {
      // Arrange
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      mockGetTripById.mockRejectedValue(new Error("403"));

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("tripPublicView.noAccess")).toBeTruthy();
      expect(warn).toHaveBeenCalledWith(
        "[TripPublicViewScreen] Chargement voyage inaccessible:",
        expect.any(Error),
      );
    });

    it("should stay silent about the failure outside development builds", async () => {
      // Arrange
      const dev = globalThis as unknown as { __DEV__: boolean };
      const previous = dev.__DEV__;
      dev.__DEV__ = false;
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      mockGetTripById.mockRejectedValue(new Error("403"));

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("tripPublicView.noAccess")).toBeTruthy();
      expect(warn).not.toHaveBeenCalled();
      dev.__DEV__ = previous;
    });

    it("should show the locked notice when the API answers with no trip", async () => {
      // Arrange
      setup({ trip: null });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("tripPublicView.noAccess")).toBeTruthy();
    });

    it("should go back from the locked notice", async () => {
      // Arrange
      setup({ trip: null });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("statut du voyage", () => {
    it("should label a trip whose departure is still ahead as upcoming", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("tripPublicView.statusUpcoming")).toBeTruthy();
    });

    it("should label a trip in progress as ongoing", async () => {
      // Arrange
      setup({
        trip: makeTrip({
          startDate: "2026-02-20T12:00:00.000Z",
          endDate: "2026-03-10T12:00:00.000Z",
        }),
      });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("tripPublicView.statusOngoing")).toBeTruthy();
    });

    it("should label a finished trip as past", async () => {
      // Arrange
      setup({
        trip: makeTrip({
          startDate: "2026-01-01T12:00:00.000Z",
          endDate: "2026-01-10T12:00:00.000Z",
        }),
      });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("tripPublicView.statusPast")).toBeTruthy();
    });
  });

  describe("statistiques", () => {
    it("should count the owner alongside the collaborators", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("3")).toBeTruthy();
    });

    it("should count a single member when the trip has no collaborator list", async () => {
      // Arrange
      setup({ trip: makeTrip({ collaborators: undefined }) });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("1")).toBeTruthy();
    });

    it("should report the number of bookings and addresses", async () => {
      // Arrange
      setup({
        bookings: [{ id: "b1", type: "flight", title: "Paris → Lima" }],
        addresses: [
          { id: "a1", name: "Hôtel Miraflores" },
          { id: "a2", name: "Chez Marcel" },
        ],
      });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("tripPublicView.statBookings")).toBeTruthy();
      expect(screen.getByText("2")).toBeTruthy();
    });
  });

  describe("description", () => {
    it("should show the description when the trip has one", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("Trek dans la vallée sacrée")).toBeTruthy();
    });

    it("should omit the description block when the trip has none", async () => {
      // Arrange
      setup({ trip: makeTrip({ description: "" }) });

      // Act
      await renderScreen();

      // Assert
      expect(screen.queryByText("Trek dans la vallée sacrée")).toBeNull();
    });
  });

  describe("onglets de contenu", () => {
    it("should open the read-only booking details when a booking is pressed", async () => {
      // Arrange
      setup({ bookings: [{ id: "b1", type: "flight", title: "Paris → Lima" }] });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("Paris → Lima"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("BookingDetails", {
        bookingId: "b1",
        readOnly: true,
      });
    });

    it("should switch to the addresses tab when it is selected", async () => {
      // Arrange
      setup({ addresses: [{ id: "a1", name: "Hôtel Miraflores" }] });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("tripPublicView.tabAddresses"));

      // Assert
      expect(screen.getByText("Hôtel Miraflores")).toBeTruthy();
    });
  });

  describe("signalement", () => {
    it("should offer the report action to a visitor who does not own the trip", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByLabelText("tripPublicView.reportTrip")).toBeTruthy();
    });

    it("should hide the report action from the owner of the trip", async () => {
      // Arrange
      setup({ userId: OWNER_ID });

      // Act
      await renderScreen();

      // Assert
      expect(screen.queryByLabelText("tripPublicView.reportTrip")).toBeNull();
    });

    it("should confirm the report once the API accepts it", async () => {
      // Arrange
      await renderScreen();
      fireEvent.press(screen.getByLabelText("tripPublicView.reportTrip"));

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("moderation.reasons.spam"));
      });

      // Assert
      expect(mockReportTrip).toHaveBeenCalledWith("t1", "spam");
      expect(alert).toHaveBeenLastCalledWith("common.ok", "tripPublicView.reportedSuccess");
    });

    it("should report the failure when the moderation call fails", async () => {
      // Arrange
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      mockReportTrip.mockRejectedValue(new Error("hors service"));
      await renderScreen();
      fireEvent.press(screen.getByLabelText("tripPublicView.reportTrip"));

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("moderation.reasons.spam"));
      });

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "tripPublicView.reportError");
      expect(warn).toHaveBeenCalledWith(
        "[TripPublicViewScreen] Erreur signalement:",
        expect.any(Error),
      );
    });

    it("should stay silent about the moderation failure outside development builds", async () => {
      // Arrange
      const dev = globalThis as unknown as { __DEV__: boolean };
      const previous = dev.__DEV__;
      dev.__DEV__ = false;
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      mockReportTrip.mockRejectedValue(new Error("hors service"));
      await renderScreen();
      fireEvent.press(screen.getByLabelText("tripPublicView.reportTrip"));

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("moderation.reasons.spam"));
      });

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "tripPublicView.reportError");
      expect(warn).not.toHaveBeenCalled();
      dev.__DEV__ = previous;
    });

    it("should close the report sheet when it is dismissed", async () => {
      // Arrange
      await renderScreen();
      fireEvent.press(screen.getByLabelText("tripPublicView.reportTrip"));

      // Act
      fireEvent.press(screen.getByText("common.cancel"));

      // Assert
      expect(screen.queryByText("moderation.reasons.spam")).toBeNull();
    });
  });

  describe("réponse à une invitation", () => {
    const TOKEN = "inv-token";

    it("should not show the invitation bar without an invitation token", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.queryByText("tripPublicView.accept")).toBeNull();
    });

    it("should show the invitation bar when the visitor arrives with a token", async () => {
      // Arrange
      setup({ invitationToken: TOKEN });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("tripPublicView.accept")).toBeTruthy();
      expect(screen.getByText("tripPublicView.decline")).toBeTruthy();
    });

    it("should join the trip and hide the bar when the invitation is accepted", async () => {
      // Arrange
      setup({ invitationToken: TOKEN });
      await renderScreen();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("tripPublicView.accept"));
      });

      // Assert
      expect(mockRespondToInvitation).toHaveBeenCalledWith(TOKEN, "accept", VIEWER_ID);
      expect(alert).toHaveBeenLastCalledWith(
        "tripPublicView.joinedTitle",
        "tripPublicView.joinedMsg",
        expect.any(Array),
      );
      expect(screen.queryByText("tripPublicView.accept")).toBeNull();
    });

    it("should send the visitor to their trips from the confirmation alert", async () => {
      // Arrange
      setup({ invitationToken: TOKEN });
      await renderScreen();
      await act(async () => {
        fireEvent.press(screen.getByText("tripPublicView.accept"));
      });

      // Act
      lastAlertButtons(alert)[0].onPress?.();

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("Main");
    });

    it("should report an error when the acceptance is refused", async () => {
      // Arrange
      mockRespondToInvitation.mockResolvedValue(false);
      setup({ invitationToken: TOKEN });
      await renderScreen();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("tripPublicView.accept"));
      });

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "tripPublicView.acceptError");
      expect(screen.getByText("tripPublicView.accept")).toBeTruthy();
    });

    it("should surface the API message when the acceptance throws", async () => {
      // Arrange
      mockRespondToInvitation.mockRejectedValue(new Error("jeton expiré"));
      setup({ invitationToken: TOKEN });
      await renderScreen();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("tripPublicView.accept"));
      });

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "jeton expiré");
    });

    it("should fall back to a generic message when the acceptance failure carries no text", async () => {
      // Arrange
      mockRespondToInvitation.mockRejectedValue(new Error(""));
      setup({ invitationToken: TOKEN });
      await renderScreen();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("tripPublicView.accept"));
      });

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "tripPublicView.unexpectedError");
    });

    it("should respond without a user identifier when nobody is signed in", async () => {
      // Arrange
      setup({ invitationToken: TOKEN, userId: null });
      await renderScreen();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("tripPublicView.accept"));
      });

      // Assert
      expect(mockRespondToInvitation).toHaveBeenCalledWith(TOKEN, "accept", undefined);
    });

    it("should ask for confirmation before declining", async () => {
      // Arrange
      setup({ invitationToken: TOKEN });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("tripPublicView.decline"));

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "tripPublicView.declineTitle",
        "tripPublicView.declineMsg",
        expect.any(Array),
      );
      expect(mockRespondToInvitation).not.toHaveBeenCalled();
    });

    it("should offer a cancel option that declines nothing", async () => {
      // Arrange
      setup({ invitationToken: TOKEN });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("tripPublicView.decline"));

      // Assert
      expect(lastAlertButtons(alert)[0]).toMatchObject({ text: "common.cancel", style: "cancel" });
      expect(mockRespondToInvitation).not.toHaveBeenCalled();
    });

    it("should leave the screen once the invitation is declined", async () => {
      // Arrange
      setup({ invitationToken: TOKEN });
      await renderScreen();
      fireEvent.press(screen.getByText("tripPublicView.decline"));

      // Act
      await act(async () => {
        await lastAlertButtons(alert)[1].onPress?.();
      });

      // Assert
      expect(mockRespondToInvitation).toHaveBeenCalledWith(TOKEN, "decline", VIEWER_ID);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("should report an error when the decline is refused", async () => {
      // Arrange
      mockRespondToInvitation.mockResolvedValue(false);
      setup({ invitationToken: TOKEN });
      await renderScreen();
      fireEvent.press(screen.getByText("tripPublicView.decline"));

      // Act
      await act(async () => {
        await lastAlertButtons(alert)[1].onPress?.();
      });

      // Assert
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(alert).toHaveBeenLastCalledWith("common.error", "tripPublicView.declineError");
    });

    it("should surface the API message when the decline throws", async () => {
      // Arrange
      mockRespondToInvitation.mockRejectedValue(new Error("jeton révoqué"));
      setup({ invitationToken: TOKEN });
      await renderScreen();
      fireEvent.press(screen.getByText("tripPublicView.decline"));

      // Act
      await act(async () => {
        await lastAlertButtons(alert)[1].onPress?.();
      });

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "jeton révoqué");
    });

    it("should fall back to a generic message when the decline failure carries no text", async () => {
      // Arrange
      mockRespondToInvitation.mockRejectedValue(new Error(""));
      setup({ invitationToken: TOKEN });
      await renderScreen();
      fireEvent.press(screen.getByText("tripPublicView.decline"));

      // Act
      await act(async () => {
        await lastAlertButtons(alert)[1].onPress?.();
      });

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "tripPublicView.unexpectedError");
    });

    it("should block a second answer while the first one is in flight", async () => {
      // Arrange
      let resolveResponse: (value: boolean) => void = () => {};
      mockRespondToInvitation.mockReturnValue(
        new Promise<boolean>((resolve) => {
          resolveResponse = resolve;
        }),
      );
      setup({ invitationToken: TOKEN });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("tripPublicView.accept"));
      await waitFor(() => expect(screen.queryByText("tripPublicView.accept")).toBeNull());
      fireEvent.press(screen.getByText("tripPublicView.decline"));

      // Assert
      expect(alert).not.toHaveBeenCalled();
      await act(async () => {
        resolveResponse(true);
      });
    });
  });
});
