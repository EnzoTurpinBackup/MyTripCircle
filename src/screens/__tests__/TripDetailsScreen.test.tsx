import "./support/tripScreenMocks";

import React from "react";
import { Alert, Animated } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import TripDetailsScreen from "../TripDetailsScreen";
import { useTripDetails } from "../../hooks/useTripDetails";
import { freezeClockAt, restoreClock } from "../../components/invitations/__tests__/frozenClock";
import type { Address, Booking, Trip } from "../../types";

// On renvoie la clé de traduction plutôt que le libellé : les assertions restent
// lisibles et insensibles aux retouches de wording.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUseRoute = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useRoute: () => mockUseRoute(),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("../../contexts/ThemeContext", () => {
  const actual = jest.requireActual("../../contexts/ThemeContext");
  return { ...actual, useTheme: () => ({ colors: actual.lightColors, isDark: false }) };
});

// L'orchestration du chargement est couverte par `useTripDetails.test.ts` : ici
// on pilote son état pour affirmer ce que l'écran en fait.
jest.mock("../../hooks/useTripDetails", () => ({ useTripDetails: jest.fn() }));

// Le formulaire de réservation embarque le scanner de billets (caméra) et a sa
// propre suite : on n'en garde ici que la frontière, pour observer ce que
// l'écran lui transmet.
jest.mock("../../components/BookingForm", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    __esModule: true,
    default: ({ visible, onClose, tripStartDate, preselectedTripId }: Record<string, any>) =>
      visible
        ? React.createElement(
            View,
            { testID: "booking-form" },
            React.createElement(Text, null, `form:${preselectedTripId}:${String(tripStartDate)}`),
            React.createElement(Text, { onPress: onClose }, "form:close"),
          )
        : null,
  };
});

// La photo de destination du bandeau est une frontière réseau (Google Places),
// interrogée au montage de `TripHero`.
jest.mock("../../utils/destinationPhoto", () => ({
  getSyncCachedPhoto: () => null,
  getCachedDestinationPhoto: () => Promise.resolve(null),
}));

jest.mock("../../utils/i18n", () => ({
  formatDate: (date: string | Date) => new Date(date).toISOString().slice(0, 10),
  formatDateLong: (date: string | Date) => new Date(date).toISOString().slice(0, 10),
  formatTime: () => "12:00",
  parseApiError: (error: unknown) => (error as { message?: string })?.message ?? "",
  getBookingStatusTranslation: (status: string) => status,
}));

type AlertButton = { text?: string; style?: string; onPress?: () => void };

// Le bandeau de progression se calcule depuis « maintenant ».
const NOW = new Date("2026-03-01T12:00:00.000Z");

const USER = { id: "u1", name: "Enzo Turpin" };

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

const makeBooking = (overrides: Partial<Booking> = {}): Booking =>
  ({
    id: "b1",
    tripId: "t1",
    type: "flight",
    title: "Paris → Lima",
    date: new Date("2026-03-15T12:00:00.000Z"),
    status: "confirmed",
    ...overrides,
  }) as Booking;

const makeAddress = (overrides: Partial<Address> = {}): Address =>
  ({
    id: "a1",
    tripId: "t1",
    type: "hotel",
    name: "Hôtel Miraflores",
    address: "12 avenida Larco",
    city: "Lima",
    country: "Pérou",
    ...overrides,
  }) as Address;

const setActiveTab = jest.fn();
const setShowBookingForm = jest.fn();
const setShowToast = jest.fn();
const handleSaveBooking = jest.fn();
const handleCopyBooking = jest.fn();
const handleCopyAddress = jest.fn();
const handleEditAddress = jest.fn();
const handleUpdateBooking = jest.fn();
const handleDeleteBooking = jest.fn();
const handleDeleteAddress = jest.fn();
const handleValidateTrip = jest.fn();

interface SetupOptions {
  hook?: Record<string, unknown>;
  params?: Record<string, unknown>;
  user?: typeof USER | null;
}

const setup = ({ hook = {}, params = {}, user = USER }: SetupOptions = {}) => {
  mockUseRoute.mockReturnValue({ params: { tripId: "t1", ...params } });
  mockUseAuth.mockReturnValue({ user });
  (useTripDetails as jest.Mock).mockReturnValue({
    trip: makeTrip(),
    bookings: [],
    addresses: [],
    loading: false,
    activeTab: "bookings",
    setActiveTab,
    showBookingForm: false,
    setShowBookingForm,
    collaboratorUsers: new Map(),
    showToast: false,
    setShowToast,
    toastOpacity: new Animated.Value(1),
    isOwner: true,
    userCollaborator: null,
    totalMembers: 1,
    progressPercent: 0,
    durationDays: 10,
    daysPassed: 0,
    handleSaveBooking,
    handleCopyBooking,
    handleCopyAddress,
    handleEditAddress,
    handleUpdateBooking,
    handleDeleteBooking,
    handleDeleteAddress,
    handleValidateTrip,
    otherBookings: [],
    otherAddresses: [],
    ...hook,
  });
};

/** Récupère les boutons passés au dernier `Alert.alert`. */
const lastAlertButtons = (alert: jest.SpyInstance): AlertButton[] =>
  (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];

/**
 * Déclenche un bouton de la dernière alerte. `Alert` est hors de l'arbre React :
 * son rappel doit être enveloppé pour que la mise à jour d'état soit rendue.
 */
const pressAlertButton = (alert: jest.SpyInstance, index: number) => {
  act(() => {
    lastAlertButtons(alert)[index].onPress?.();
  });
};

describe("TripDetailsScreen", () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    freezeClockAt(NOW);
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    setup();
  });

  afterEach(() => {
    restoreClock();
    jest.restoreAllMocks();
  });

  describe("chargement", () => {
    it("should show the skeleton instead of the trip while loading", () => {
      // Arrange
      setup({ hook: { loading: true } });

      // Act
      render(<TripDetailsScreen />);

      // Assert
      expect(screen.queryByText("Pérou 2026")).toBeNull();
      expect(screen.queryByText("tripDetails.notFound")).toBeNull();
    });

    it("should show a not-found notice when the trip could not be loaded", () => {
      // Arrange
      setup({ hook: { trip: null } });

      // Act
      render(<TripDetailsScreen />);

      // Assert
      expect(screen.getByText("tripDetails.notFound")).toBeTruthy();
    });

    it("should pass the toast route parameter to the details hook", () => {
      // Arrange
      setup({ params: { showToast: true } });

      // Act
      render(<TripDetailsScreen />);

      // Assert
      expect(useTripDetails).toHaveBeenCalledWith("t1", true);
    });
  });

  describe("bandeau du voyage", () => {
    it("should show the trip title and destination", () => {
      // Arrange & Act
      render(<TripDetailsScreen />);

      // Assert
      expect(screen.getByText("Pérou 2026")).toBeTruthy();
    });

    it("should go back from the hero back button", () => {
      // Arrange
      render(<TripDetailsScreen />);

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("bandeau brouillon", () => {
    it("should hide the draft banner for a validated trip", () => {
      // Arrange & Act
      render(<TripDetailsScreen />);

      // Assert
      expect(screen.queryByText("tripDetails.draftMessage")).toBeNull();
    });

    it("should show the draft banner when the trip is still a draft", () => {
      // Arrange
      setup({ hook: { trip: makeTrip({ status: "draft" }) } });

      // Act
      render(<TripDetailsScreen />);

      // Assert
      expect(screen.getByText("tripDetails.draftMessage")).toBeTruthy();
    });

    it("should show the draft banner when the route asks for the validate button", () => {
      // Arrange
      setup({ params: { showValidateButton: true } });

      // Act
      render(<TripDetailsScreen />);

      // Assert
      expect(screen.getByText("tripDetails.draftMessage")).toBeTruthy();
    });

    it("should validate the trip when the banner button is pressed", () => {
      // Arrange
      setup({ hook: { trip: makeTrip({ status: "draft" }) } });
      render(<TripDetailsScreen />);

      // Act
      fireEvent.press(screen.getByText("tripDetails.validateTrip"));

      // Assert
      expect(handleValidateTrip).toHaveBeenCalledTimes(1);
    });
  });

  describe("onglets", () => {
    it("should show the bookings tab by default", () => {
      // Arrange
      setup({ hook: { bookings: [makeBooking()] } });

      // Act
      render(<TripDetailsScreen />);

      // Assert
      expect(screen.getByText("Paris → Lima")).toBeTruthy();
    });

    it("should ask the hook to switch tab when another tab is pressed", () => {
      // Arrange
      render(<TripDetailsScreen />);

      // Act
      fireEvent.press(screen.getByText("tripDetails.tabAddresses"));

      // Assert
      expect(setActiveTab).toHaveBeenCalledWith("addresses");
    });

    it("should show the addresses tab when it is active", () => {
      // Arrange
      setup({ hook: { activeTab: "addresses", addresses: [makeAddress()] } });

      // Act
      render(<TripDetailsScreen />);

      // Assert
      expect(screen.getByText("Hôtel Miraflores")).toBeTruthy();
    });

    it("should show the members tab when it is active", () => {
      // Arrange
      setup({ hook: { activeTab: "members" } });

      // Act
      render(<TripDetailsScreen />);

      // Assert
      expect(screen.getByText("Enzo Turpin")).toBeTruthy();
    });

    it("should open the invitation screen from the members tab", () => {
      // Arrange
      setup({ hook: { activeTab: "members" } });
      render(<TripDetailsScreen />);

      // Act
      fireEvent.press(screen.getByText("tripDetails.inviteFriends"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("InviteFriends", { tripId: "t1" });
    });
  });

  describe("ajout d'une réservation", () => {
    it("should open the booking form straight away when there is nothing to copy", () => {
      // Arrange
      render(<TripDetailsScreen />);

      // Act
      fireEvent.press(screen.getByText("tripDetails.addBooking"));

      // Assert
      expect(setShowBookingForm).toHaveBeenCalledWith(true);
      expect(alert).not.toHaveBeenCalled();
    });

    it("should offer to copy an existing booking when the user already has some", () => {
      // Arrange
      setup({ hook: { otherBookings: [makeBooking({ id: "b2", tripId: "t2" })] } });
      render(<TripDetailsScreen />);

      // Act
      fireEvent.press(screen.getByText("tripDetails.addBooking"));

      // Assert
      expect(alert).toHaveBeenCalledWith("tripDetails.addBooking", undefined, expect.any(Array));
      expect(setShowBookingForm).not.toHaveBeenCalled();
    });

    it("should open a blank booking form from the choice alert", () => {
      // Arrange
      setup({ hook: { otherBookings: [makeBooking({ id: "b2", tripId: "t2" })] } });
      render(<TripDetailsScreen />);
      fireEvent.press(screen.getByText("tripDetails.addBooking"));

      // Act
      pressAlertButton(alert, 0);

      // Assert
      expect(setShowBookingForm).toHaveBeenCalledWith(true);
    });

    it("should open the existing-booking picker from the choice alert", () => {
      // Arrange
      setup({ hook: { otherBookings: [makeBooking({ id: "b2", tripId: "t2", title: "Lima → Cusco" })] } });
      render(<TripDetailsScreen />);
      fireEvent.press(screen.getByText("tripDetails.addBooking"));

      // Act
      pressAlertButton(alert, 1);

      // Assert
      expect(screen.getByText("tripDetails.pickExistingBooking")).toBeTruthy();
    });

    it("should offer a cancel option that opens nothing", () => {
      // Arrange
      setup({ hook: { otherBookings: [makeBooking({ id: "b2", tripId: "t2" })] } });
      render(<TripDetailsScreen />);

      // Act
      fireEvent.press(screen.getByText("tripDetails.addBooking"));

      // Assert
      expect(lastAlertButtons(alert)[2]).toMatchObject({ text: "common.cancel", style: "cancel" });
      expect(setShowBookingForm).not.toHaveBeenCalled();
    });

    it("should copy the booking chosen in the picker and close it", () => {
      // Arrange
      const other = makeBooking({ id: "b2", tripId: "t2", title: "Lima → Cusco" });
      setup({ hook: { otherBookings: [other] } });
      render(<TripDetailsScreen />);
      fireEvent.press(screen.getByText("tripDetails.addBooking"));
      pressAlertButton(alert, 1);

      // Act
      fireEvent.press(screen.getByText("Lima → Cusco"));

      // Assert
      expect(handleCopyBooking).toHaveBeenCalledWith(other);
      expect(screen.queryByText("tripDetails.pickExistingBooking")).toBeNull();
    });

    it("should close the booking picker when it is dismissed", () => {
      // Arrange
      setup({ hook: { otherBookings: [makeBooking({ id: "b2", tripId: "t2" })] } });
      render(<TripDetailsScreen />);
      fireEvent.press(screen.getByText("tripDetails.addBooking"));
      pressAlertButton(alert, 1);

      // Act
      fireEvent.press(screen.getByText("icon:close"));

      // Assert
      expect(screen.queryByText("tripDetails.pickExistingBooking")).toBeNull();
    });

    it("should hand the trip dates to the booking form when it is open", () => {
      // Arrange
      setup({ hook: { showBookingForm: true } });

      // Act
      render(<TripDetailsScreen />);

      // Assert
      expect(screen.getByTestId("booking-form")).toBeTruthy();
      expect(screen.getByText(/^form:t1:/)).toBeTruthy();
    });

    it("should close the booking form when it asks to be dismissed", () => {
      // Arrange
      setup({ hook: { showBookingForm: true } });
      render(<TripDetailsScreen />);

      // Act
      fireEvent.press(screen.getByText("form:close"));

      // Assert
      expect(setShowBookingForm).toHaveBeenCalledWith(false);
    });
  });

  describe("ajout d'une adresse", () => {
    it("should always offer the choice between a new and an existing address", () => {
      // Arrange
      setup({ hook: { activeTab: "addresses" } });
      render(<TripDetailsScreen />);

      // Act
      fireEvent.press(screen.getByText("tripDetails.addAddress"));

      // Assert
      expect(alert).toHaveBeenCalledWith("tripDetails.addAddress", undefined, expect.any(Array));
    });

    it("should open the address form from the choice alert", () => {
      // Arrange
      setup({ hook: { activeTab: "addresses" } });
      render(<TripDetailsScreen />);
      fireEvent.press(screen.getByText("tripDetails.addAddress"));

      // Act
      pressAlertButton(alert, 0);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("AddressForm", { tripId: "t1" });
    });

    it("should copy the address chosen in the picker and close it", () => {
      // Arrange
      const other = makeAddress({ id: "a2", tripId: "t2", name: "Casa Cusco" });
      setup({ hook: { activeTab: "addresses", otherAddresses: [other] } });
      render(<TripDetailsScreen />);
      fireEvent.press(screen.getByText("tripDetails.addAddress"));
      pressAlertButton(alert, 1);

      // Act
      fireEvent.press(screen.getByText("Casa Cusco"));

      // Assert
      expect(handleCopyAddress).toHaveBeenCalledWith(other);
      expect(screen.queryByText("tripDetails.pickExistingAddress")).toBeNull();
    });

    it("should close the address picker when it is dismissed", () => {
      // Arrange
      setup({ hook: { activeTab: "addresses" } });
      render(<TripDetailsScreen />);
      fireEvent.press(screen.getByText("tripDetails.addAddress"));
      pressAlertButton(alert, 1);

      // Act
      fireEvent.press(screen.getByText("icon:close"));

      // Assert
      expect(screen.queryByText("tripDetails.pickExistingAddress")).toBeNull();
    });
  });

  describe("droits d'édition", () => {
    it("should let a collaborator with edit rights add an address", () => {
      // Arrange
      setup({
        hook: {
          activeTab: "addresses",
          isOwner: false,
          userCollaborator: { userId: "u1", permissions: { canEdit: true } },
        },
      });

      // Act
      render(<TripDetailsScreen />);

      // Assert
      expect(screen.getByText("tripDetails.addAddress")).toBeTruthy();
    });

    it("should hide the address creation from a read-only collaborator", () => {
      // Arrange
      setup({
        hook: {
          activeTab: "addresses",
          isOwner: false,
          userCollaborator: { userId: "u1", permissions: { canEdit: false } },
        },
      });

      // Act
      render(<TripDetailsScreen />);

      // Assert
      expect(screen.queryByText("tripDetails.addAddress")).toBeNull();
    });

    it("should hide the booking creation from a read-only collaborator", () => {
      // Arrange
      setup({ hook: { isOwner: false, userCollaborator: null } });

      // Act
      render(<TripDetailsScreen />);

      // Assert
      expect(screen.queryByText("tripDetails.addBooking")).toBeNull();
    });
  });

  describe("notification de mise à jour", () => {
    it("should hide the toast by default", () => {
      // Arrange & Act
      render(<TripDetailsScreen />);

      // Assert
      expect(screen.queryByText("tripDetails.toastUpdatedTitle")).toBeNull();
    });

    it("should show the toast when the hook raises it", () => {
      // Arrange
      setup({ hook: { showToast: true } });

      // Act
      render(<TripDetailsScreen />);

      // Assert
      expect(screen.getByText("tripDetails.toastUpdatedTitle")).toBeTruthy();
      expect(screen.getByText("tripDetails.toastUpdatedSub")).toBeTruthy();
    });

    it("should dismiss the toast when its close button is pressed", () => {
      // Arrange
      setup({ hook: { showToast: true } });
      render(<TripDetailsScreen />);

      // Act
      fireEvent.press(screen.getByText("✕"));

      // Assert
      expect(setShowToast).toHaveBeenCalledWith(false);
    });
  });
});
