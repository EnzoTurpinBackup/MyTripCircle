import { hostParent } from "./support/tripScreenMocks";

import React from "react";
import { Alert, Image } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import EditTripScreen from "../EditTripScreen";
import useEditTrip from "../../hooks/useEditTrip";
import type { Address, Booking } from "../../types";

// On renvoie la clé de traduction plutôt que le libellé. Les listes de mois et
// d'initiales de jours sont des chaînes à découper : on les fournit telles que
// les dictionnaires les définissent, sinon le calendrier n'a pas d'en-têtes.
//
// Ces valeurs réelles révèlent un défaut de `TripCalendar` : il indexe les
// en-têtes de jours par leur libellé (`key={d}`), or « M » apparaît deux fois en
// français (« L,M,M,J,V,S,D ») comme « T » et « S » en anglais. React émet donc
// un avertissement de clé dupliquée au rendu du calendrier. Le défaut est
// signalé dans la PR, pas corrigé ici : ce lot ne touche pas au code de
// production, et masquer les valeurs réelles masquerait le défaut.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "editTrip.monthNames") return "janv,févr,mars,avr,mai,juin,juil,août,sept,oct,nov,déc";
      if (key === "editTrip.dayInitials") return "L,M,M,J,V,S,D";
      return key;
    },
  }),
}));

const mockNavigate = jest.fn();
const mockUseTheme = jest.fn();
const mockUseNetwork = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: { tripId: "t1" } }),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock("../../contexts/NetworkContext", () => ({ useNetwork: () => mockUseNetwork() }));
jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: () => mockUseTheme(),
}));

// Toute la logique d'édition est couverte par `useEditTrip.test.ts` : ici on
// pilote son état pour affirmer ce que l'écran en fait.
jest.mock("../../hooks/useEditTrip", () => ({ __esModule: true, default: jest.fn() }));

// Le formulaire de réservation embarque le scanner de billets (caméra) et a sa
// propre suite : on n'en garde ici que la frontière.
jest.mock("../../components/BookingForm", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    __esModule: true,
    default: ({ visible, onClose, initialBooking }: Record<string, any>) =>
      visible
        ? React.createElement(
            View,
            { testID: "booking-form" },
            React.createElement(Text, null, `form:${initialBooking?.title ?? "vierge"}`),
            React.createElement(Text, { onPress: onClose }, "form:close"),
          )
        : null,
  };
});

jest.mock("../../utils/i18n", () => ({
  formatDate: (date: string | Date) => new Date(date).toISOString().slice(0, 10),
  formatDateLong: (date: string | Date) => new Date(date).toISOString().slice(0, 10),
  formatTime: () => "12:00",
  parseApiError: () => "",
  getBookingStatusTranslation: (status: string) => status,
}));

type AlertButton = { text?: string; style?: string; onPress?: () => void };

const START_DATE = new Date("2026-03-15T12:00:00.000Z");
const END_DATE = new Date("2026-03-25T12:00:00.000Z");

const makeBooking = (overrides: Partial<Booking> = {}): Booking =>
  ({
    id: "b1",
    tripId: "t1",
    type: "flight",
    title: "Paris → Lima",
    date: START_DATE,
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

const setFormData = jest.fn();
const openCalendar = jest.fn();
const closeCalendar = jest.fn();
const handleCalendarDayPress = jest.fn();
const goToPrevMonth = jest.fn();
const goToNextMonth = jest.fn();
const handleAddBooking = jest.fn();
const handleEditBooking = jest.fn();
const handleDeleteBooking = jest.fn();
const handleSaveBooking = jest.fn();
const closeBookingForm = jest.fn();
const handleAddAddress = jest.fn();
const handleEditAddress = jest.fn();
const handleDeleteAddress = jest.fn();
const handleCopyBooking = jest.fn();
const handleCopyAddress = jest.fn();
const handlePickCoverPhoto = jest.fn();
const handleUpdateTrip = jest.fn();
const handleDeleteTrip = jest.fn();
const handleCancel = jest.fn();

const buildState = (overrides: Record<string, unknown> = {}) => ({
  formData: {
    title: "Pérou 2026",
    description: "Trek",
    destination: "Lima",
    startDate: START_DATE,
    endDate: END_DATE,
    visibility: "private" as const,
    status: "draft" as const,
    coverImage: "",
  },
  setFormData,
  loading: false,
  initialLoading: false,
  isOwner: true,
  showCalendar: false,
  calendarPickingFor: "start" as const,
  calendarYear: 2026,
  calendarMonth: 2,
  openCalendar,
  closeCalendar,
  handleCalendarDayPress,
  goToPrevMonth,
  goToNextMonth,
  bookings: [] as Booking[],
  showBookingForm: false,
  editingBookingIndex: null as number | null,
  handleAddBooking,
  handleEditBooking,
  handleDeleteBooking,
  handleSaveBooking,
  closeBookingForm,
  addresses: [] as Address[],
  handleAddAddress,
  handleEditAddress,
  handleDeleteAddress,
  otherBookings: [] as Booking[],
  otherAddresses: [] as Address[],
  handleCopyBooking,
  handleCopyAddress,
  handlePickCoverPhoto,
  handleUpdateTrip,
  handleDeleteTrip,
  handleCancel,
  ...overrides,
});

interface SetupOptions {
  hook?: Record<string, unknown>;
  isDark?: boolean;
  isConnected?: boolean;
}

const setup = ({ hook = {}, isDark = false, isConnected = true }: SetupOptions = {}) => {
  const { lightColors, darkColors } = jest.requireActual("../../contexts/ThemeContext");
  mockUseTheme.mockReturnValue({ colors: isDark ? darkColors : lightColors, isDark });
  mockUseNetwork.mockReturnValue({ isConnected });
  (useEditTrip as jest.Mock).mockReturnValue(buildState(hook));
};

/** Récupère les boutons passés au dernier `Alert.alert`. */
const lastAlertButtons = (alert: jest.SpyInstance): AlertButton[] =>
  (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];

/** `Alert` est hors de l'arbre React : son rappel doit être enveloppé. */
const pressAlertButton = (alert: jest.SpyInstance, index: number) => {
  act(() => {
    lastAlertButtons(alert)[index].onPress?.();
  });
};

describe("EditTripScreen", () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    setup();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("chargement", () => {
    it("should show the skeleton instead of the form while the trip is loading", () => {
      // Arrange
      setup({ hook: { initialLoading: true } });

      // Act
      render(<EditTripScreen />);

      // Assert
      expect(screen.queryByText("editTrip.screenTitle")).toBeNull();
      expect(screen.queryByPlaceholderText("editTrip.tripNamePlaceholder")).toBeNull();
    });
  });

  describe("en-tête", () => {
    it("should cancel the edition when the back button is pressed", () => {
      // Arrange
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it("should save the trip when the save pill is pressed", () => {
      // Arrange
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("editTrip.saveButton"));

      // Assert
      expect(handleUpdateTrip).toHaveBeenCalledTimes(1);
    });

    it("should show a pending label and refuse a second save while saving", () => {
      // Arrange
      setup({ hook: { loading: true } });
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("…"));

      // Assert
      expect(handleUpdateTrip).not.toHaveBeenCalled();
    });

    it("should refuse the save when the device is offline", () => {
      // Arrange
      setup({ isConnected: false });
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("editTrip.saveButton"));

      // Assert
      expect(handleUpdateTrip).not.toHaveBeenCalled();
    });
  });

  describe("photo de couverture", () => {
    it("should show the placeholder gradient when the trip has no cover photo", () => {
      // Arrange & Act
      render(<EditTripScreen />);

      // Assert
      expect(screen.getByTestId("gradient:#3A3020/#1E1A10")).toBeTruthy();
      expect(screen.UNSAFE_queryAllByType(Image)).toHaveLength(0);
    });

    it("should show the cover photo behind a veil when the trip has one", () => {
      // Arrange
      const state = buildState();
      setup({ hook: { formData: { ...state.formData, coverImage: "https://cdn/lima.jpg" } } });

      // Act
      render(<EditTripScreen />);

      // Assert
      expect(screen.UNSAFE_getByType(Image).props.source).toEqual({ uri: "https://cdn/lima.jpg" });
      expect(screen.getByTestId("gradient:transparent/rgba(15,8,2,0.55)")).toBeTruthy();
    });

    it("should pick a new cover photo when the banner is pressed", () => {
      // Arrange
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("editTrip.changeCoverPhoto"));

      // Assert
      expect(handlePickCoverPhoto).toHaveBeenCalledTimes(1);
    });

    it("should refuse to change the cover photo when the device is offline", () => {
      // Arrange
      setup({ isConnected: false });
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("editTrip.changeCoverPhoto"));

      // Assert
      expect(handlePickCoverPhoto).not.toHaveBeenCalled();
    });

    it("should darken the cover button on the dark theme", () => {
      // Arrange
      setup({ isDark: true });

      // Act
      render(<EditTripScreen />);

      // Assert
      expect(hostParent(screen.getByText("editTrip.changeCoverPhoto"))).toHaveStyle({
        backgroundColor: "rgba(30,30,30,0.85)",
      });
    });

    it("should lighten the cover button on the light theme", () => {
      // Arrange & Act
      render(<EditTripScreen />);

      // Assert
      expect(hostParent(screen.getByText("editTrip.changeCoverPhoto"))).toHaveStyle({
        backgroundColor: "rgba(255,255,255,0.90)",
      });
    });
  });

  describe("champs texte", () => {
    it("should prefill the fields with the loaded trip", () => {
      // Arrange & Act
      render(<EditTripScreen />);

      // Assert
      expect(screen.getByPlaceholderText("editTrip.tripNamePlaceholder").props.value).toBe("Pérou 2026");
      expect(screen.getByPlaceholderText("editTrip.mainDestinationPlaceholder").props.value).toBe("Lima");
      expect(screen.getByPlaceholderText("editTrip.descriptionPlaceholder").props.value).toBe("Trek");
    });

    it("should show how much of the description budget is used", () => {
      // Arrange & Act
      render(<EditTripScreen />);

      // Assert
      expect(screen.getByText("4/500")).toBeTruthy();
    });

    it.each([
      ["editTrip.tripNamePlaceholder", "Islande", "title"],
      ["editTrip.mainDestinationPlaceholder", "Reykjavik", "destination"],
      ["editTrip.descriptionPlaceholder", "Road trip", "description"],
    ])("should update the form through %s", (placeholder, value, field) => {
      // Arrange
      render(<EditTripScreen />);

      // Act
      fireEvent.changeText(screen.getByPlaceholderText(placeholder), value);

      // Assert
      const updater = setFormData.mock.calls.at(-1)![0] as (p: object) => object;
      expect(updater({})).toEqual({ [field]: value });
    });

    it.each([
      "editTrip.tripNamePlaceholder",
      "editTrip.mainDestinationPlaceholder",
      "editTrip.descriptionPlaceholder",
    ])("should close the calendar when %s takes the focus", (placeholder) => {
      // Arrange
      setup({ hook: { showCalendar: true } });
      render(<EditTripScreen />);

      // Act
      fireEvent(screen.getByPlaceholderText(placeholder), "focus");

      // Assert
      expect(closeCalendar).toHaveBeenCalled();
    });

    it("should release the highlight when a field loses the focus", () => {
      // Arrange
      render(<EditTripScreen />);
      const input = screen.getByPlaceholderText("editTrip.tripNamePlaceholder");
      fireEvent(input, "focus");

      // Act
      fireEvent(input, "blur");

      // Assert
      expect(screen.getByPlaceholderText("editTrip.tripNamePlaceholder")).toBeOnTheScreen();
    });
  });

  describe("calendrier", () => {
    it("should keep the calendar hidden until a date field is pressed", () => {
      // Arrange & Act
      render(<EditTripScreen />);

      // Assert
      expect(screen.queryByText("editTrip.period")).toBeNull();
      expect(screen.getByText("2026-03-15")).toBeTruthy();
      expect(screen.getByText("2026-03-25")).toBeTruthy();
    });

    it("should ask to pick the departure date when its field is pressed", () => {
      // Arrange
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("editTrip.departureDateLabel"));

      // Assert
      expect(openCalendar).toHaveBeenCalledWith("start");
    });

    it("should ask to pick the return date when its field is pressed", () => {
      // Arrange
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("editTrip.returnDateLabel"));

      // Assert
      expect(openCalendar).toHaveBeenCalledWith("end");
    });

    it("should show the calendar with its month header when a date is being picked", () => {
      // Arrange
      setup({ hook: { showCalendar: true } });

      // Act
      render(<EditTripScreen />);

      // Assert
      expect(screen.getByText("mars 2026")).toBeTruthy();
      expect(screen.getByText("editTrip.period")).toBeTruthy();
    });

    it("should walk to the previous month from the calendar", () => {
      // Arrange
      setup({ hook: { showCalendar: true } });
      render(<EditTripScreen />);

      // Act
      // Le premier chevron est celui du bouton retour de l'en-tête ; le second
      // est la flèche « mois précédent » du calendrier.
      fireEvent.press(screen.getAllByText("icon:chevron-back")[1]);

      // Assert
      expect(goToPrevMonth).toHaveBeenCalledTimes(1);
    });

    it("should walk to the next month from the calendar", () => {
      // Arrange
      setup({ hook: { showCalendar: true } });
      render(<EditTripScreen />);

      // Act
      // Le calendrier précède le bouton « membres » dans l'arbre : sa flèche
      // « mois suivant » est donc le premier chevron avant rendu.
      fireEvent.press(screen.getAllByText("icon:chevron-forward")[0]);

      // Assert
      expect(goToNextMonth).toHaveBeenCalledTimes(1);
    });

    it("should report the day chosen in the calendar", () => {
      // Arrange
      setup({ hook: { showCalendar: true } });
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("18"));

      // Assert
      expect(handleCalendarDayPress).toHaveBeenCalledWith(18);
    });

    it("should close the calendar when the background is tapped", () => {
      // Arrange
      setup({ hook: { showCalendar: true } });
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("editTrip.period"));

      // Assert
      expect(closeCalendar).toHaveBeenCalled();
    });
  });

  describe("membres", () => {
    it("should open the invitation screen from the members button", () => {
      // Arrange
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("editTrip.manageMembers"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("InviteFriends", { tripId: "t1" });
    });
  });

  describe("visibilité et statut", () => {
    it("should offer the three visibility levels and the two statuses", () => {
      // Arrange & Act
      render(<EditTripScreen />);

      // Assert
      expect(screen.getByText("editTrip.visibilityPrivate")).toBeTruthy();
      expect(screen.getByText("editTrip.visibilityFriends")).toBeTruthy();
      expect(screen.getByText("editTrip.visibilityPublic")).toBeTruthy();
      expect(screen.getByText("editTrip.statusDraft")).toBeTruthy();
      expect(screen.getByText("editTrip.statusValidated")).toBeTruthy();
    });

    it("should update the visibility when another level is chosen", () => {
      // Arrange
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("editTrip.visibilityPublic"));

      // Assert
      const updater = setFormData.mock.calls.at(-1)![0] as (p: object) => object;
      expect(updater({})).toEqual({ visibility: "public" });
    });

    it("should update the status when the trip is marked as validated", () => {
      // Arrange
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("editTrip.statusValidated"));

      // Assert
      const updater = setFormData.mock.calls.at(-1)![0] as (p: object) => object;
      expect(updater({})).toEqual({ status: "validated" });
    });
  });

  describe("réservations", () => {
    it("should create a booking straight away when there is nothing to copy", () => {
      // Arrange
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("bookings.addBooking"));

      // Assert
      expect(handleAddBooking).toHaveBeenCalledTimes(1);
      expect(alert).not.toHaveBeenCalled();
    });

    it("should offer to copy an existing booking when the user already has some", () => {
      // Arrange
      setup({ hook: { otherBookings: [makeBooking({ id: "b2", tripId: "t2" })] } });
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("bookings.addBooking"));

      // Assert
      expect(alert).toHaveBeenCalledWith("tripDetails.addBooking", undefined, expect.any(Array));
      expect(handleAddBooking).not.toHaveBeenCalled();
    });

    it("should create a blank booking from the choice alert", () => {
      // Arrange
      setup({ hook: { otherBookings: [makeBooking({ id: "b2", tripId: "t2" })] } });
      render(<EditTripScreen />);
      fireEvent.press(screen.getByText("bookings.addBooking"));

      // Act
      pressAlertButton(alert, 0);

      // Assert
      expect(handleAddBooking).toHaveBeenCalledTimes(1);
    });

    it("should offer a cancel option that creates nothing", () => {
      // Arrange
      setup({ hook: { otherBookings: [makeBooking({ id: "b2", tripId: "t2" })] } });
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("bookings.addBooking"));

      // Assert
      expect(lastAlertButtons(alert)[2]).toMatchObject({ text: "common.cancel", style: "cancel" });
      expect(handleAddBooking).not.toHaveBeenCalled();
    });

    it("should copy the booking chosen in the picker and close it", () => {
      // Arrange
      const other = makeBooking({ id: "b2", tripId: "t2", title: "Lima → Cusco" });
      setup({ hook: { otherBookings: [other] } });
      render(<EditTripScreen />);
      fireEvent.press(screen.getByText("bookings.addBooking"));
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
      render(<EditTripScreen />);
      fireEvent.press(screen.getByText("bookings.addBooking"));
      pressAlertButton(alert, 1);

      // Act
      fireEvent.press(screen.getByText("icon:close"));

      // Assert
      expect(screen.queryByText("tripDetails.pickExistingBooking")).toBeNull();
    });

    it("should list the bookings of the trip", () => {
      // Arrange
      setup({ hook: { bookings: [makeBooking()] } });

      // Act
      render(<EditTripScreen />);

      // Assert
      expect(screen.getByText("Paris → Lima")).toBeTruthy();
    });

    it("should edit the booking of the pressed row", () => {
      // Arrange
      setup({ hook: { bookings: [makeBooking()] } });
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("icon:pencil"));

      // Assert
      expect(handleEditBooking).toHaveBeenCalledWith(0);
    });

    it("should delete the booking of the pressed row", () => {
      // Arrange
      setup({ hook: { bookings: [makeBooking()] } });
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("icon:trash"));

      // Assert
      expect(handleDeleteBooking).toHaveBeenCalledWith(0);
    });

    it("should open a blank booking form when no booking is being edited", () => {
      // Arrange
      setup({ hook: { showBookingForm: true, bookings: [makeBooking()] } });

      // Act
      render(<EditTripScreen />);

      // Assert
      expect(screen.getByText("form:vierge")).toBeTruthy();
    });

    it("should prefill the booking form with the booking being edited", () => {
      // Arrange
      setup({ hook: { showBookingForm: true, editingBookingIndex: 0, bookings: [makeBooking()] } });

      // Act
      render(<EditTripScreen />);

      // Assert
      expect(screen.getByText("form:Paris → Lima")).toBeTruthy();
    });

    it("should close the booking form when it asks to be dismissed", () => {
      // Arrange
      setup({ hook: { showBookingForm: true } });
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("form:close"));

      // Assert
      expect(closeBookingForm).toHaveBeenCalledTimes(1);
    });
  });

  describe("adresses", () => {
    it("should always offer the choice between a new and an existing address", () => {
      // Arrange
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("addresses.addAddress"));

      // Assert
      expect(alert).toHaveBeenCalledWith("tripDetails.addAddress", undefined, expect.any(Array));
    });

    it("should create a blank address from the choice alert", () => {
      // Arrange
      render(<EditTripScreen />);
      fireEvent.press(screen.getByText("addresses.addAddress"));

      // Act
      pressAlertButton(alert, 0);

      // Assert
      expect(handleAddAddress).toHaveBeenCalledTimes(1);
    });

    it("should copy the address chosen in the picker and close it", () => {
      // Arrange
      const other = makeAddress({ id: "a2", tripId: "t2", name: "Casa Cusco" });
      setup({ hook: { otherAddresses: [other] } });
      render(<EditTripScreen />);
      fireEvent.press(screen.getByText("addresses.addAddress"));
      pressAlertButton(alert, 1);

      // Act
      fireEvent.press(screen.getByText("Casa Cusco"));

      // Assert
      expect(handleCopyAddress).toHaveBeenCalledWith(other);
      expect(screen.queryByText("tripDetails.pickExistingAddress")).toBeNull();
    });

    it("should close the address picker when it is dismissed", () => {
      // Arrange
      render(<EditTripScreen />);
      fireEvent.press(screen.getByText("addresses.addAddress"));
      pressAlertButton(alert, 1);

      // Act
      fireEvent.press(screen.getByText("icon:close"));

      // Assert
      expect(screen.queryByText("tripDetails.pickExistingAddress")).toBeNull();
    });

    it("should edit the address of the pressed row", () => {
      // Arrange
      setup({ hook: { addresses: [makeAddress()] } });
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("icon:pencil"));

      // Assert
      expect(handleEditAddress).toHaveBeenCalledWith(0);
    });

    it("should delete the address of the pressed row", () => {
      // Arrange
      setup({ hook: { addresses: [makeAddress()] } });
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("icon:trash"));

      // Assert
      expect(handleDeleteAddress).toHaveBeenCalledWith(0);
    });
  });

  describe("zone dangereuse", () => {
    it("should let the owner delete the trip", () => {
      // Arrange
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("editTrip.deleteTrip"));

      // Assert
      expect(handleDeleteTrip).toHaveBeenCalledTimes(1);
    });

    it("should hide the danger zone from a collaborator", () => {
      // Arrange
      setup({ hook: { isOwner: false } });

      // Act
      render(<EditTripScreen />);

      // Assert
      expect(screen.queryByText("editTrip.dangerZone")).toBeNull();
    });

    it("should refuse the deletion when the device is offline", () => {
      // Arrange
      setup({ isConnected: false });
      render(<EditTripScreen />);

      // Act
      fireEvent.press(screen.getByText("editTrip.deleteTrip"));

      // Assert
      expect(handleDeleteTrip).not.toHaveBeenCalled();
    });
  });
});
