// Suite dédiée à la variante Android de l'évitement du clavier : iOS décale le
// contenu (`padding`) là où Android le compresse (`height`). La plateforme est
// lue au rendu, mais `jest-expo` s'exécute sur iOS par défaut : seule une suite
// distincte peut couvrir cette branche.

jest.mock("react-native/Libraries/Utilities/Platform", () => {
  const actual = jest.requireActual("react-native/Libraries/Utilities/Platform");
  const base = actual.default ?? actual;
  const android = {
    ...base,
    OS: "android",
    select: (options: Record<string, unknown>) =>
      "android" in options ? options.android : options.default,
  };
  return { __esModule: true, default: android, ...android };
});

import "./support/tripScreenMocks";

import React from "react";
import { KeyboardAvoidingView } from "react-native";
import { render, screen } from "@testing-library/react-native";

import EditTripScreen from "../EditTripScreen";
import useEditTrip from "../../hooks/useEditTrip";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "editTrip.monthNames") return "janv,févr,mars,avr,mai,juin,juil,août,sept,oct,nov,déc";
      if (key === "editTrip.dayInitials") return "L,M,M,J,V,S,D";
      return key;
    },
  }),
}));

jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: { tripId: "t1" } }),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock("../../contexts/NetworkContext", () => ({ useNetwork: () => ({ isConnected: true }) }));
jest.mock("../../contexts/ThemeContext", () => {
  const actual = jest.requireActual("../../contexts/ThemeContext");
  return { ...actual, useTheme: () => ({ colors: actual.lightColors, isDark: false }) };
});

jest.mock("../../hooks/useEditTrip", () => ({ __esModule: true, default: jest.fn() }));

jest.mock("../../components/BookingForm", () => ({ __esModule: true, default: () => null }));

jest.mock("../../utils/i18n", () => ({
  formatDate: (date: string | Date) => new Date(date).toISOString().slice(0, 10),
  formatDateLong: (date: string | Date) => new Date(date).toISOString().slice(0, 10),
  formatTime: () => "12:00",
  parseApiError: () => "",
  getBookingStatusTranslation: (status: string) => status,
}));

describe("EditTripScreen sur Android", () => {
  beforeEach(() => {
    (useEditTrip as jest.Mock).mockReturnValue({
      formData: {
        title: "Pérou 2026",
        description: "",
        destination: "Lima",
        startDate: new Date("2026-03-15T12:00:00.000Z"),
        endDate: new Date("2026-03-25T12:00:00.000Z"),
        visibility: "private",
        status: "draft",
        coverImage: "",
      },
      setFormData: jest.fn(),
      loading: false,
      initialLoading: false,
      isOwner: true,
      showCalendar: false,
      calendarPickingFor: "start",
      calendarYear: 2026,
      calendarMonth: 2,
      openCalendar: jest.fn(),
      closeCalendar: jest.fn(),
      handleCalendarDayPress: jest.fn(),
      goToPrevMonth: jest.fn(),
      goToNextMonth: jest.fn(),
      bookings: [],
      showBookingForm: false,
      editingBookingIndex: null,
      handleAddBooking: jest.fn(),
      handleEditBooking: jest.fn(),
      handleDeleteBooking: jest.fn(),
      handleSaveBooking: jest.fn(),
      closeBookingForm: jest.fn(),
      addresses: [],
      handleAddAddress: jest.fn(),
      handleEditAddress: jest.fn(),
      handleDeleteAddress: jest.fn(),
      otherBookings: [],
      otherAddresses: [],
      handleCopyBooking: jest.fn(),
      handleCopyAddress: jest.fn(),
      handlePickCoverPhoto: jest.fn(),
      handleUpdateTrip: jest.fn(),
      handleDeleteTrip: jest.fn(),
      handleCancel: jest.fn(),
    });
  });

  it("should compress the layout rather than pad it when the keyboard opens", () => {
    // Arrange & Act
    render(<EditTripScreen />);

    // Assert
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe("height");
  });
});
