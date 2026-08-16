jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return { Ionicons: (props: any) => <Text {...props} /> };
});

jest.mock("../../../contexts/ThemeContext", () => {
  const actual = jest.requireActual("../../../contexts/ThemeContext");
  return {
    ...actual,
    useTheme: () => ({
      isDark: mockIsDark,
      colors: mockIsDark ? actual.darkColors : actual.lightColors,
      toggleTheme: jest.fn(),
      satelliteMap: false,
      toggleSatelliteMap: jest.fn(),
    }),
  };
});
let mockIsDark = false;

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { countIcons } from "../../__tests__/voyagesTestUtils";
import TripContentTabs from "../TripContentTabs";

const booking = (overrides: Record<string, any> = {}) => ({
  _id: "b1",
  type: "flight",
  title: "Paris → Lima",
  startDate: "2026-03-15T12:00:00.000Z",
  ...overrides,
});

const address = (overrides: Record<string, any> = {}) => ({
  _id: "a1",
  type: "hotel",
  name: "Hôtel Miraflores",
  city: "Lima",
  country: "Pérou",
  ...overrides,
});

const renderTabs = (props: Partial<React.ComponentProps<typeof TripContentTabs>> = {}) =>
  render(
    <TripContentTabs
      activeTab="bookings"
      onTabChange={jest.fn()}
      bookings={[]}
      addresses={[]}
      onBookingPress={jest.fn()}
      {...props}
    />,
  );

beforeEach(() => {
  mockIsDark = false;
});

describe("TripContentTabs — barre d'onglets", () => {
  it("should show the count of each tab", () => {
    renderTabs({ bookings: [booking()], addresses: [address(), address({ _id: "a2" })] });

    expect(screen.getByText("Bookings (1)")).toBeTruthy();
    expect(screen.getByText("Addresses (2)")).toBeTruthy();
  });

  it("should switch to the addresses tab when it is pressed", () => {
    const onTabChange = jest.fn();
    renderTabs({ onTabChange });

    fireEvent.press(screen.getByText("Addresses (0)"));

    expect(onTabChange).toHaveBeenCalledWith("addresses");
  });

  it("should switch to the bookings tab when it is pressed", () => {
    const onTabChange = jest.fn();
    renderTabs({ activeTab: "addresses", onTabChange });

    fireEvent.press(screen.getByText("Bookings (0)"));

    expect(onTabChange).toHaveBeenCalledWith("bookings");
  });

  it("should highlight the active tab only", () => {
    renderTabs({ activeTab: "bookings" });

    const active = screen.getByText("Bookings (0)");
    const inactive = screen.getByText("Addresses (0)");

    expect(active.props.style).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([expect.objectContaining({ color: "#C4714A" })]),
      ]),
    );
    expect(inactive.props.style).not.toContainEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#C4714A" })]),
    );
  });
});

describe("TripContentTabs — onglet réservations", () => {
  it("should show the empty message when there is no booking", () => {
    renderTabs();

    expect(screen.getByText("No bookings visible")).toBeTruthy();
  });

  it("should list a booking with its start date", () => {
    renderTabs({ bookings: [booking()] });

    expect(screen.getByText("Paris → Lima")).toBeTruthy();
    expect(screen.getByText("Mar 15, 2026")).toBeTruthy();
  });

  it("should show a date range when the booking has an end date", () => {
    renderTabs({ bookings: [booking({ endDate: "2026-03-18T12:00:00.000Z" })] });

    expect(screen.getByText("Mar 15, 2026 – Mar 18, 2026")).toBeTruthy();
  });

  it("should omit the date line when the booking has no start date", () => {
    renderTabs({ bookings: [booking({ startDate: undefined })] });

    expect(screen.getByText("Paris → Lima")).toBeTruthy();
    expect(screen.queryByText("Mar 15, 2026")).toBeNull();
  });

  it("should show the price with its currency", () => {
    renderTabs({ bookings: [booking({ price: 320, currency: "USD" })] });

    expect(screen.getByText("320 USD")).toBeTruthy();
  });

  it("should fall back to the default currency when none is given", () => {
    renderTabs({ bookings: [booking({ price: 320 })] });

    expect(screen.getByText("320€")).toBeTruthy();
  });

  it("should show no price when the booking has none", () => {
    renderTabs({ bookings: [booking()] });

    expect(screen.queryByText(/€/)).toBeNull();
  });

  it("should show a zero price rather than hiding it", () => {
    renderTabs({ bookings: [booking({ price: 0 })] });

    expect(screen.getByText("0€")).toBeTruthy();
  });

  it("should open the booking that is tapped", () => {
    const onBookingPress = jest.fn();
    renderTabs({ bookings: [booking()], onBookingPress });

    fireEvent.press(screen.getByText("Paris → Lima"));

    expect(onBookingPress).toHaveBeenCalledWith("b1");
  });

  it("should fall back to the id field when the booking has no _id", () => {
    const onBookingPress = jest.fn();
    renderTabs({ bookings: [booking({ _id: undefined, id: "legacy-1" })], onBookingPress });

    fireEvent.press(screen.getByText("Paris → Lima"));

    expect(onBookingPress).toHaveBeenCalledWith("legacy-1");
  });

  it("should use the fallback colours for an unknown booking type", () => {
    renderTabs({ bookings: [booking({ type: "cruise" })] });

    expect(countIcons("receipt")).toBe(1);
  });

  it("should render the bookings tab in dark mode", () => {
    mockIsDark = true;
    renderTabs({ bookings: [booking()] });

    expect(screen.getByText("Paris → Lima")).toBeTruthy();
  });
});

describe("TripContentTabs — onglet adresses", () => {
  it("should show the empty message when there is no address", () => {
    renderTabs({ activeTab: "addresses" });

    expect(screen.getByText("No addresses visible")).toBeTruthy();
  });

  it("should list an address with its city and country", () => {
    renderTabs({ activeTab: "addresses", addresses: [address()] });

    expect(screen.getByText("Hôtel Miraflores")).toBeTruthy();
    expect(screen.getByText("Lima, Pérou")).toBeTruthy();
  });

  it("should show the country alone when the address has no city", () => {
    renderTabs({ activeTab: "addresses", addresses: [address({ city: undefined })] });

    expect(screen.getByText("Pérou")).toBeTruthy();
  });

  it("should omit the location line when the address has neither city nor country", () => {
    renderTabs({
      activeTab: "addresses",
      addresses: [address({ city: undefined, country: undefined })],
    });

    expect(screen.getByText("Hôtel Miraflores")).toBeTruthy();
    expect(screen.queryByText("Lima, Pérou")).toBeNull();
  });

  it("should fall back to the id field when the address has no _id", () => {
    renderTabs({ activeTab: "addresses", addresses: [address({ _id: undefined, id: "legacy-a" })] });

    expect(screen.getByText("Hôtel Miraflores")).toBeTruthy();
  });

  it.each([
    ["hotel", "🏨"],
    ["restaurant", "🍽️"],
    ["activity", "🎯"],
    ["other", "📍"],
  ])("should show the %s emoji for that address type", (type, emoji) => {
    renderTabs({ activeTab: "addresses", addresses: [address({ type })] });

    expect(screen.getByText(emoji)).toBeTruthy();
  });

  it("should not render the bookings list while the addresses tab is active", () => {
    renderTabs({ activeTab: "addresses", bookings: [booking()], addresses: [address()] });

    expect(screen.queryByText("Paris → Lima")).toBeNull();
  });
});
