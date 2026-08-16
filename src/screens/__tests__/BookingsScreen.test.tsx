// Éléments volontairement non couverts, tous inatteignables depuis l'IHM :
//   - l. 64 garde `if (!actionBooking) return` de `handleSaveEdit` : le
//     formulaire d'édition n'est monté qu'avec `showEditForm`, lui-même déclenché
//     depuis la feuille d'actions, qui exige une réservation sélectionnée ;
//   - l. 76 garde `if (!actionBooking) return` de `handleDeletePress` : même
//     raison, la feuille d'actions est un `Modal` masqué sans sélection ;
//   - l. 58 dernier maillon `t("bookings.createBookingError")` de la chaîne de
//     repli : i18next renvoie la clé quand la traduction manque, donc
//     `t("bookings.saveError")` est toujours vrai. Code mort signalé, non corrigé.

import "./support/screenMocks";

import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import BookingsScreen from "../BookingsScreen";
import { lightColors } from "../../contexts/ThemeContext";
import { parseApiError } from "../../utils/i18n";
import { OFFLINE_OPACITY } from "../../hooks/useOfflineDisabled";
import type { Booking } from "../../types";

/** Brouillon remonté par le formulaire doublé ; réarmé à chaque test. */
const DEFAULT_DRAFT = { type: "flight", title: "Vol AF123", tripId: "trip-1" };
const mockBookingDraft: { value: Record<string, unknown> } = { value: DEFAULT_DRAFT };

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

// `useFocusEffect` doit exécuter son effet au montage, comme le ferait la
// navigation réelle lorsque l'onglet prend le focus.
jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return { useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]) };
});

// Le geste de navigation entre onglets repose sur `react-native-gesture-handler` :
// il n'apporte rien au rendu et son détecteur natif n'est pas monté en test.
jest.mock("../../hooks/useSwipeToNavigate", () => ({
  SwipeToNavigate: ({ children }: { children: React.ReactNode }) => children,
}));

// Le formulaire de réservation est un écran modal complet (caméra, scanner de
// billet, sélecteurs natifs) : on le remplace par deux commandes minimales.
jest.mock("../../components/BookingForm", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    __esModule: true,
    default: ({ visible, onClose, onSave, initialBooking }: any) => {
      if (!visible) return null;
      const kind = initialBooking ? "edit" : "create";
      return React.createElement(
        View,
        null,
        React.createElement(
          Text,
          { testID: `booking-form:${kind}:save`, onPress: () => onSave(mockBookingDraft.value) },
          "save",
        ),
        React.createElement(Text, { testID: `booking-form:${kind}:close`, onPress: onClose }, "close"),
      );
    },
  };
});

jest.mock("../../utils/i18n", () => ({
  ...jest.requireActual("../../utils/i18n"),
  parseApiError: jest.fn(),
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

const mockParseApiError = parseApiError as jest.Mock;

const handlers = {
  createBooking: jest.fn(),
  updateBooking: jest.fn(),
  deleteBooking: jest.fn(),
  refreshData: jest.fn(),
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
  loading?: boolean;
  isConnected?: boolean;
}

const setupScreenMocks = (options: SetupOptions = {}) => {
  const { bookings = [makeBooking()], loading = false, isConnected = true } = options;

  mockUseTrips.mockReturnValue({
    bookings,
    loading,
    createBooking: handlers.createBooking,
    updateBooking: handlers.updateBooking,
    deleteBooking: handlers.deleteBooking,
    refreshData: handlers.refreshData,
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
  render(<BookingsScreen />);
  await act(async () => {});
};

describe("BookingsScreen", () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    setupScreenMocks();
    mockBookingDraft.value = DEFAULT_DRAFT;
    mockParseApiError.mockReturnValue("");
    handlers.createBooking.mockResolvedValue(undefined);
    handlers.updateBooking.mockResolvedValue(undefined);
    handlers.deleteBooking.mockResolvedValue(undefined);
    handlers.refreshData.mockResolvedValue(undefined);
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("chargement", () => {
    it("should show the skeleton while the bookings are loading", async () => {
      // Arrange
      setupScreenMocks({ loading: true });

      // Act
      await renderScreen();

      // Assert
      expect(screen.queryByText("bookings.header")).toBeNull();
    });

    it("should refresh the bookings when the tab takes focus", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(handlers.refreshData).toHaveBeenCalledTimes(1);
    });
  });

  describe("filtres", () => {
    it("should list every booking when no filter is active", async () => {
      // Arrange
      setupScreenMocks({
        bookings: [makeBooking(), makeBooking({ id: "book-2", type: "hotel", title: "Hôtel Lisboa" })],
      });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("Vol Paris – Lisbonne")).toBeTruthy();
      expect(screen.getByText("Hôtel Lisboa")).toBeTruthy();
    });

    it("should keep only the bookings matching the selected filter", async () => {
      // Arrange
      setupScreenMocks({
        bookings: [makeBooking(), makeBooking({ id: "book-2", type: "hotel", title: "Hôtel Lisboa" })],
      });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("bookings.filters.hotel"));

      // Assert
      expect(screen.getByText("Hôtel Lisboa")).toBeTruthy();
      expect(screen.queryByText("Vol Paris – Lisbonne")).toBeNull();
    });

    it("should highlight the selected filter pill in white", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("bookings.filters.train"));

      // Assert
      expect(flatten(screen.getByText("bookings.filters.train").props.style).color).toBe(
        lightColors.white,
      );
      expect(flatten(screen.getByText("bookings.filters.all").props.style).color).not.toBe(
        lightColors.white,
      );
    });

    it("should still render a booking that has no identifier", async () => {
      // Arrange
      setupScreenMocks({ bookings: [makeBooking({ id: "", title: "Sans identifiant" })] });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("Sans identifiant")).toBeTruthy();
    });
  });

  describe("liste vide", () => {
    it("should invite the user to add a first booking", async () => {
      // Arrange
      setupScreenMocks({ bookings: [] });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("bookings.emptyAll")).toBeTruthy();
    });

    it("should explain that the active filter matches nothing", async () => {
      // Arrange
      setupScreenMocks({ bookings: [] });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("bookings.filters.train"));

      // Assert
      expect(screen.getByText("bookings.emptyFiltered")).toBeTruthy();
    });

    it("should open the creation form from the empty state", async () => {
      // Arrange
      setupScreenMocks({ bookings: [] });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("bookings.addBooking"));

      // Assert
      expect(screen.getByTestId("booking-form:create:save")).toBeTruthy();
    });

    it("should disable the empty state button while the device is offline", async () => {
      // Arrange
      setupScreenMocks({ bookings: [], isConnected: false });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("bookings.addBooking")).toBeDisabled();
    });
  });

  describe("création d'une réservation", () => {
    const openCreationForm = async () => {
      await renderScreen();
      fireEvent.press(screen.getByText("icon:add"));
    };

    it("should open the creation form from the header button", async () => {
      // Arrange & Act
      await openCreationForm();

      // Assert
      expect(screen.getByTestId("booking-form:create:save")).toBeTruthy();
    });

    it("should disable the header button while the device is offline", async () => {
      // Arrange
      setupScreenMocks({ isConnected: false });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("icon:add")).toBeDisabled();
    });

    it("should dim the header button while the device is offline", async () => {
      // Arrange
      setupScreenMocks({ isConnected: false });

      // Act
      await renderScreen();

      // Assert
      expect(opacityOf(screen.getByText("icon:add"))).toBe(OFFLINE_OPACITY);
    });

    it("should create the booking and refresh the list", async () => {
      // Arrange
      await openCreationForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:create:save"));
      await act(async () => {});

      // Assert
      expect(handlers.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({ tripId: "trip-1", title: "Vol AF123" }),
      );
      expect(handlers.refreshData).toHaveBeenCalledTimes(2);
    });

    it("should default the trip identifier when the draft carries none", async () => {
      // Arrange
      mockBookingDraft.value = { type: "flight", title: "Vol sans voyage" };
      await openCreationForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:create:save"));
      await act(async () => {});

      // Assert
      expect(handlers.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({ tripId: "" }),
      );
    });

    it("should close the form once the booking is created", async () => {
      // Arrange
      await openCreationForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:create:save"));
      await act(async () => {});

      // Assert
      expect(screen.queryByTestId("booking-form:create:save")).toBeNull();
    });

    it("should close the form when the user gives up", async () => {
      // Arrange
      await openCreationForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:create:close"));

      // Assert
      expect(screen.queryByTestId("booking-form:create:save")).toBeNull();
    });

    it("should report the api error when the creation fails", async () => {
      // Arrange
      mockParseApiError.mockReturnValue("Vol complet");
      handlers.createBooking.mockRejectedValue(new Error("409"));
      await openCreationForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:create:save"));
      await act(async () => {});

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "Vol complet");
    });

    it("should fall back to a generic message when the api says nothing", async () => {
      // Arrange
      handlers.createBooking.mockRejectedValue(new Error(""));
      await openCreationForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:create:save"));
      await act(async () => {});

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "bookings.saveError");
    });

    it("should keep the form open when the creation fails", async () => {
      // Arrange
      handlers.createBooking.mockRejectedValue(new Error("409"));
      await openCreationForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:create:save"));
      await act(async () => {});

      // Assert
      expect(screen.getByTestId("booking-form:create:save")).toBeTruthy();
    });
  });

  describe("feuille d'actions", () => {
    const openActionSheet = async () => {
      await renderScreen();
      fireEvent.press(screen.getByText("Vol Paris – Lisbonne"));
    };

    it("should stay hidden while no booking is selected", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.queryByText("common.edit")).toBeNull();
    });

    it("should name the selected booking", async () => {
      // Arrange & Act
      await openActionSheet();

      // Assert
      expect(screen.getAllByText("Vol Paris – Lisbonne").length).toBeGreaterThan(1);
    });

    it("should close itself when the cancel button is pressed", async () => {
      // Arrange
      await openActionSheet();

      // Act
      fireEvent.press(screen.getByText("common.cancel"));

      // Assert
      expect(screen.queryByText("common.edit")).toBeNull();
    });

    it("should give way to the edit form", async () => {
      // Arrange
      await openActionSheet();

      // Act
      fireEvent.press(screen.getByText("common.edit"));

      // Assert
      expect(screen.getByTestId("booking-form:edit:save")).toBeTruthy();
      expect(screen.queryByText("common.edit")).toBeNull();
    });
  });

  describe("édition d'une réservation", () => {
    const openEditForm = async () => {
      await renderScreen();
      fireEvent.press(screen.getByText("Vol Paris – Lisbonne"));
      fireEvent.press(screen.getByText("common.edit"));
    };

    it("should update the booking and refresh the list", async () => {
      // Arrange
      await openEditForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:edit:save"));
      await act(async () => {});

      // Assert
      expect(handlers.updateBooking).toHaveBeenCalledWith("book-1", DEFAULT_DRAFT);
      expect(handlers.refreshData).toHaveBeenCalledTimes(2);
    });

    it("should close the edit form once the update succeeds", async () => {
      // Arrange
      await openEditForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:edit:save"));
      await act(async () => {});

      // Assert
      expect(screen.queryByTestId("booking-form:edit:save")).toBeNull();
    });

    it("should report the api error when the update fails", async () => {
      // Arrange
      mockParseApiError.mockReturnValue("Réservation verrouillée");
      handlers.updateBooking.mockRejectedValue(new Error("423"));
      await openEditForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:edit:save"));
      await act(async () => {});

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "Réservation verrouillée");
    });

    it("should fall back to a generic message when the api says nothing", async () => {
      // Arrange
      handlers.updateBooking.mockRejectedValue(new Error(""));
      await openEditForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:edit:save"));
      await act(async () => {});

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "bookings.details.errorUpdateBooking");
    });

    it("should deselect the booking when the edit form is dismissed", async () => {
      // Arrange
      await openEditForm();

      // Act
      fireEvent.press(screen.getByTestId("booking-form:edit:close"));

      // Assert
      expect(screen.queryByTestId("booking-form:edit:save")).toBeNull();
      expect(screen.queryByText("common.edit")).toBeNull();
    });
  });

  describe("suppression d'une réservation", () => {
    const pressDelete = async () => {
      await renderScreen();
      fireEvent.press(screen.getByText("Vol Paris – Lisbonne"));
      fireEvent.press(screen.getByText("common.delete"));
    };

    const confirmDeletion = async () => {
      const buttons = (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
      await act(async () => {
        await buttons[1].onPress?.();
      });
    };

    it("should ask for confirmation before deleting", async () => {
      // Arrange & Act
      await pressDelete();

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "common.delete",
        "bookings.deleteConfirm",
        expect.any(Array),
      );
      expect(handlers.deleteBooking).not.toHaveBeenCalled();
    });

    it("should close the action sheet before asking for confirmation", async () => {
      // Arrange & Act
      await pressDelete();

      // Assert
      expect(screen.queryByText("common.edit")).toBeNull();
    });

    it("should delete the booking and refresh the list once confirmed", async () => {
      // Arrange
      await pressDelete();

      // Act
      await confirmDeletion();

      // Assert
      expect(handlers.deleteBooking).toHaveBeenCalledWith("book-1");
      expect(handlers.refreshData).toHaveBeenCalledTimes(2);
    });

    it("should report the api error when the deletion fails", async () => {
      // Arrange
      mockParseApiError.mockReturnValue("Suppression refusée");
      handlers.deleteBooking.mockRejectedValue(new Error("403"));
      await pressDelete();

      // Act
      await confirmDeletion();

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "Suppression refusée");
    });

    it("should fall back to a generic message when the api says nothing", async () => {
      // Arrange
      handlers.deleteBooking.mockRejectedValue(new Error(""));
      await pressDelete();

      // Act
      await confirmDeletion();

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "bookings.details.errorDeleteBooking");
    });
  });
});
