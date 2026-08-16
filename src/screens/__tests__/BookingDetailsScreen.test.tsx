// Branche volontairement non couverte :
//   - l. 69 garde `if (!booking) return` de `handleSaveBooking` : le formulaire
//     d'édition n'est monté que dans le bloc `{booking && …}`, la garde est donc
//     inatteignable depuis l'IHM.

import "./support/uiMocks";

import React from "react";
import { Alert, Linking } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import BookingDetailsScreen from "../BookingDetailsScreen";
import { lightColors } from "../../contexts/ThemeContext";
import { ApiService } from "../../services/ApiService";
import { formatDateLong, parseApiError } from "../../utils/i18n";
import { OFFLINE_OPACITY } from "../../hooks/useOfflineDisabled";
import type { Booking } from "../../types";

const mockBookingDraft = { type: "flight", title: "Vol AF123" };

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

const mockUseRoute = jest.fn();
const mockGoBack = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useRoute: () => mockUseRoute(),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

// Le formulaire de réservation est un écran modal complet (caméra, scanner de
// billet, sélecteurs natifs) : on le remplace par deux commandes minimales.
jest.mock("../../components/BookingForm", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    __esModule: true,
    default: ({ visible, onClose, onSave }: any) => {
      if (!visible) return null;
      return React.createElement(
        View,
        null,
        React.createElement(
          Text,
          { testID: "booking-form:save", onPress: () => onSave(mockBookingDraft) },
          "save",
        ),
        React.createElement(Text, { testID: "booking-form:close", onPress: onClose }, "close"),
      );
    },
  };
});

// La photo de couverture du bandeau est une frontière réseau.
jest.mock("../../utils/destinationPhoto", () => ({
  getSyncCachedPhoto: () => null,
  getCachedDestinationPhoto: () => Promise.resolve(null),
}));

jest.mock("../../utils/i18n", () => ({
  ...jest.requireActual("../../utils/i18n"),
  formatDateLong: jest.fn(),
  parseApiError: jest.fn(),
}));

jest.mock("../../services/ApiService", () => ({
  ApiService: { getBookingById: jest.fn() },
}));

const mockUseTrips = jest.fn();
jest.mock("../../contexts/TripsContext", () => ({ useTrips: () => mockUseTrips() }));

const mockUseTheme = jest.fn();
jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: () => mockUseTheme(),
}));

const mockUseNetwork = jest.fn();
jest.mock("../../contexts/NetworkContext", () => ({ useNetwork: () => mockUseNetwork() }));

const mockFormatDateLong = formatDateLong as jest.Mock;
const mockParseApiError = parseApiError as jest.Mock;
const mockGetBookingById = ApiService.getBookingById as jest.Mock;

const handlers = {
  updateBooking: jest.fn(),
  deleteBooking: jest.fn(),
};

const makeBooking = (overrides: Partial<Booking> = {}): Booking =>
  ({
    id: "book-1",
    tripId: "trip-1",
    type: "flight",
    title: "Vol Paris – Lisbonne",
    date: new Date("2026-06-01T00:00:00.000Z"),
    status: "confirmed",
    ...overrides,
  }) as Booking;

interface SetupOptions {
  bookings?: Booking[];
  bookingId?: string;
  readOnly?: boolean;
  isConnected?: boolean;
}

const setupScreenMocks = (options: SetupOptions = {}) => {
  const { bookings = [makeBooking()], bookingId = "book-1", isConnected = true } = options;

  // `readOnly` reste absent des paramètres par défaut : c'est ainsi que la
  // navigation appelle l'écran, et c'est la valeur par défaut du destructuring
  // qui décide alors de l'affichage des actions.
  mockUseRoute.mockReturnValue({
    params: "readOnly" in options ? { bookingId, readOnly: options.readOnly } : { bookingId },
  });
  mockUseTrips.mockReturnValue({
    bookings,
    updateBooking: handlers.updateBooking,
    deleteBooking: handlers.deleteBooking,
  });
  mockUseTheme.mockReturnValue({ colors: lightColors, isDark: false });
  mockUseNetwork.mockReturnValue({ isConnected });
};

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

/** Opacité effective d'un élément, portée par un ancêtre pressable. */
const opacityOf = (element: { props: { style?: unknown }; parent: unknown } | null) => {
  let current = element;
  while (current) {
    const { opacity } = flatten(current.props.style);
    if (typeof opacity === "number") return opacity;
    current = current.parent as typeof current;
  }
  return undefined;
};

type AlertButton = { text?: string; onPress?: () => void | Promise<void> };

const renderScreen = async () => {
  render(<BookingDetailsScreen />);
  await act(async () => {});
};

describe("BookingDetailsScreen", () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    setupScreenMocks();
    mockFormatDateLong.mockImplementation((d: Date) => `date:${new Date(d).toISOString().slice(0, 10)}`);
    mockParseApiError.mockReturnValue("");
    handlers.updateBooking.mockResolvedValue(undefined);
    handlers.deleteBooking.mockResolvedValue(undefined);
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
  });

  describe("chargement de la réservation", () => {
    it("should read the booking from the trips context", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("Vol Paris – Lisbonne")).toBeTruthy();
      expect(mockGetBookingById).not.toHaveBeenCalled();
    });

    it("should also match the booking on its mongo identifier", async () => {
      // Arrange
      setupScreenMocks({
        bookings: [makeBooking({ id: "other", _id: "book-1" } as Partial<Booking>)],
      });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("Vol Paris – Lisbonne")).toBeTruthy();
    });

    it("should fetch the booking from the api when the context ignores it", async () => {
      // Arrange
      setupScreenMocks({ bookings: [] });
      mockGetBookingById.mockResolvedValue({
        _id: "book-1",
        tripId: "trip-1",
        type: "hotel",
        title: "Hôtel Lisboa",
        date: "2026-06-01T00:00:00.000Z",
      });

      // Act
      await renderScreen();

      // Assert
      expect(mockGetBookingById).toHaveBeenCalledWith("book-1");
      expect(screen.getByText("Hôtel Lisboa")).toBeTruthy();
    });

    it("should fall back to the plain identifier when the api returns no mongo id", async () => {
      // Arrange
      setupScreenMocks({ bookings: [] });
      mockGetBookingById.mockResolvedValue({
        id: "book-1",
        type: "hotel",
        title: "Hôtel Lisboa",
        date: "2026-06-01T00:00:00.000Z",
      });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("bookings.details.editButton"));
      fireEvent.press(screen.getByTestId("booking-form:save"));
      await act(async () => {});

      // Assert
      expect(handlers.updateBooking).toHaveBeenCalledWith("book-1", mockBookingDraft);
    });

    it("should report a missing booking when the api fails", async () => {
      // Arrange
      const error = jest.spyOn(console, "error").mockImplementation(() => {});
      setupScreenMocks({ bookings: [] });
      mockGetBookingById.mockRejectedValue(new Error("404"));

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("bookings.details.notFound")).toBeTruthy();
      expect(error).toHaveBeenCalledWith(
        "[BookingDetailsScreen] Erreur lors du chargement de la réservation:",
        expect.any(Error),
      );
    });

    it("should show the skeleton while the booking is being fetched", () => {
      // Arrange
      setupScreenMocks({ bookings: [] });
      mockGetBookingById.mockReturnValue(new Promise(() => {}));

      // Act
      render(<BookingDetailsScreen />);

      // Assert
      expect(screen.queryByText("bookings.details.notFound")).toBeNull();
      expect(screen.queryByText("Vol Paris – Lisbonne")).toBeNull();
    });
  });

  describe("grille d'informations", () => {
    it("should display the booking date", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("date:2026-06-01")).toBeTruthy();
    });

    it("should append the end date when the booking spans several days", async () => {
      // Arrange
      setupScreenMocks({
        bookings: [makeBooking({ endDate: new Date("2026-06-05T00:00:00.000Z") })],
      });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("date:2026-06-01\n– date:2026-06-05")).toBeTruthy();
    });

    it("should display the booking time", async () => {
      // Arrange
      setupScreenMocks({ bookings: [makeBooking({ time: "18:40" })] });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("18:40")).toBeTruthy();
    });

    it("should dash out the missing time and confirmation number", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getAllByText("–")).toHaveLength(2);
    });

    it.each([
      ["flight", "bookings.details.gridThirdLabel.flight"],
      ["train", "bookings.details.gridThirdLabel.train"],
      ["hotel", "bookings.details.gridThirdLabel.hotel"],
      ["restaurant", "bookings.details.gridThirdLabel.restaurant"],
      ["activity", "bookings.details.gridThirdLabel.activity"],
      ["other", "bookings.details.gridThirdLabel.default"],
    ])("should label the third cell for a %s booking", async (type, label) => {
      // Arrange
      setupScreenMocks({ bookings: [makeBooking({ type: type as Booking["type"] })] });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  describe("blocs optionnels", () => {
    it("should show the confirmation number card when there is one", async () => {
      // Arrange
      setupScreenMocks({ bookings: [makeBooking({ confirmationNumber: "AF123X" })] });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("bookings.details.confirmationNumberShort")).toBeTruthy();
      expect(screen.getAllByText("AF123X")).toHaveLength(2);
    });

    it("should hide the confirmation card when the booking has none", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.queryByText("bookings.details.confirmationNumberShort")).toBeNull();
    });

    it("should display the description when there is one", async () => {
      // Arrange
      setupScreenMocks({ bookings: [makeBooking({ description: "Bagage cabine inclus" })] });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("Bagage cabine inclus")).toBeTruthy();
    });

    it("should hide the description block when the booking has none", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.queryByText("bookings.details.description")).toBeNull();
    });

    it("should hide the attachments section when the booking has none", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.queryByText("bookings.details.attachmentsSectionTitle")).toBeNull();
    });

    it("should hide the attachments section when the list is empty", async () => {
      // Arrange
      setupScreenMocks({ bookings: [makeBooking({ attachments: [] })] });

      // Act
      await renderScreen();

      // Assert
      expect(screen.queryByText("bookings.details.attachmentsSectionTitle")).toBeNull();
    });
  });

  describe("pièces jointes", () => {
    it("should name the attachment from its label when one is provided", async () => {
      // Arrange
      setupScreenMocks({
        bookings: [makeBooking({ attachments: ["Billet.pdf::file:///tmp/billet.pdf"] })],
      });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("📄 Billet.pdf")).toBeTruthy();
    });

    it("should name the attachment from its file name otherwise", async () => {
      // Arrange
      setupScreenMocks({ bookings: [makeBooking({ attachments: ["file:///tmp/billet.pdf"] })] });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("📄 billet.pdf")).toBeTruthy();
    });

    it("should open the attachment with the system viewer", async () => {
      // Arrange
      const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
      setupScreenMocks({ bookings: [makeBooking({ attachments: ["file:///tmp/billet.pdf"] })] });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("📄 billet.pdf"));
      await act(async () => {});

      // Assert
      expect(openURL).toHaveBeenCalledWith("file:///tmp/billet.pdf");
    });

    it("should keep the raw attachment as its own name when the path ends with a slash", async () => {
      // Arrange
      setupScreenMocks({ bookings: [makeBooking({ attachments: ["file:///tmp/"] })] });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("📄 file:///tmp/")).toBeTruthy();
    });

    it("should refuse to open an attachment that is not a uri", async () => {
      // Arrange
      setupScreenMocks({ bookings: [makeBooking({ attachments: ["billet-scanne"] })] });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("📄 billet-scanne"));

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "bookings.details.fileNotAccessible");
    });

    it("should report an attachment that the system cannot open", async () => {
      // Arrange
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no handler"));
      setupScreenMocks({ bookings: [makeBooking({ attachments: ["https://tickets.test/x.pdf"] })] });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("📄 x.pdf"));
      await act(async () => {});

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "bookings.details.fileOpenError");
      expect(warn).toHaveBeenCalledWith(
        "[BookingDetailsScreen] Erreur ouverture fichier:",
        expect.any(Error),
      );
    });

    it("should stay silent about an unopenable attachment outside development builds", async () => {
      // Arrange
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no handler"));
      (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
      setupScreenMocks({ bookings: [makeBooking({ attachments: ["https://tickets.test/x.pdf"] })] });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("📄 x.pdf"));
      await act(async () => {});

      // Assert
      expect(warn).not.toHaveBeenCalled();
      expect(alert).toHaveBeenCalledWith("common.error", "bookings.details.fileOpenError");
    });
  });

  describe("actions", () => {
    it("should hide the actions in read-only mode", async () => {
      // Arrange
      setupScreenMocks({ readOnly: true });

      // Act
      await renderScreen();

      // Assert
      expect(screen.queryByText("bookings.details.editButton")).toBeNull();
    });

    it("should go back when the hero back button is pressed", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("should disable the actions while the device is offline", async () => {
      // Arrange
      setupScreenMocks({ isConnected: false });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("bookings.details.editButton")).toBeDisabled();
      expect(screen.getByText("bookings.details.deleteButton")).toBeDisabled();
    });

    it("should dim the actions while the device is offline", async () => {
      // Arrange
      setupScreenMocks({ isConnected: false });

      // Act
      await renderScreen();

      // Assert
      expect(opacityOf(screen.getByText("bookings.details.editButton"))).toBe(OFFLINE_OPACITY);
    });
  });

  describe("édition de la réservation", () => {
    const openEditForm = async () => {
      await renderScreen();
      fireEvent.press(screen.getByText("bookings.details.editButton"));
    };

    it("should update the booking with its mongo identifier when it has one", async () => {
      // Arrange
      setupScreenMocks({
        bookings: [makeBooking({ _id: "mongo-1" } as Partial<Booking>)],
      });
      await openEditForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:save"));
      await act(async () => {});

      // Assert
      expect(handlers.updateBooking).toHaveBeenCalledWith("mongo-1", mockBookingDraft);
    });

    it("should close the form once the update succeeds", async () => {
      // Arrange
      await openEditForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:save"));
      await act(async () => {});

      // Assert
      expect(screen.queryByTestId("booking-form:save")).toBeNull();
    });

    it("should report the api error when the update fails", async () => {
      // Arrange
      mockParseApiError.mockReturnValue("Réservation verrouillée");
      handlers.updateBooking.mockRejectedValue(new Error("423"));
      await openEditForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:save"));
      await act(async () => {});

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "Réservation verrouillée");
    });

    it("should fall back to a generic message when the api says nothing", async () => {
      // Arrange
      handlers.updateBooking.mockRejectedValue(new Error(""));
      await openEditForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:save"));
      await act(async () => {});

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "bookings.details.errorUpdateBooking");
    });

    it("should close the form when the user gives up", async () => {
      // Arrange
      await openEditForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:close"));

      // Assert
      expect(screen.queryByTestId("booking-form:save")).toBeNull();
    });
  });

  describe("annulation de la réservation", () => {
    const confirmCancellation = async () => {
      fireEvent.press(screen.getByText("bookings.details.deleteButton"));
      const buttons = (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
      await act(async () => {
        await buttons[1].onPress?.();
      });
    };

    it("should ask for confirmation before cancelling", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("bookings.details.deleteButton"));

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "bookings.details.cancelBooking",
        "bookings.details.cancelConfirm",
        expect.any(Array),
      );
      expect(handlers.deleteBooking).not.toHaveBeenCalled();
    });

    it("should delete the booking and go back once confirmed", async () => {
      // Arrange
      await renderScreen();

      // Act
      await confirmCancellation();

      // Assert
      expect(handlers.deleteBooking).toHaveBeenCalledWith("book-1");
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("should still go back when the booking carries no identifier", async () => {
      // Arrange
      setupScreenMocks({ bookings: [makeBooking({ id: "" })], bookingId: "" });
      await renderScreen();

      // Act
      await confirmCancellation();

      // Assert
      expect(handlers.deleteBooking).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("should report the api error when the cancellation fails", async () => {
      // Arrange
      mockParseApiError.mockReturnValue("Annulation impossible");
      handlers.deleteBooking.mockRejectedValue(new Error("403"));
      await renderScreen();

      // Act
      await confirmCancellation();

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "Annulation impossible");
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it("should fall back to a generic message when the api says nothing", async () => {
      // Arrange
      handlers.deleteBooking.mockRejectedValue(new Error(""));
      await renderScreen();

      // Act
      await confirmCancellation();

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "bookings.details.errorDeleteBooking");
    });
  });
});
