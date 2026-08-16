import "../../__tests__/support/nativeMocks";

import React from "react";
import { View } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import BookingCard from "../BookingCard";
import { useTheme, lightColors, darkColors } from "../../../contexts/ThemeContext";
import type { Booking } from "../../../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// `utils/i18n` initialise i18next et le client API au chargement : on ne garde
// que les deux formateurs utilisés par la carte.
jest.mock("../../../utils/i18n", () => ({
  formatDate: (date: Date) => `date(${date.toISOString().slice(0, 10)})`,
  getBookingStatusTranslation: (status: string) => `statut(${status})`,
}));

jest.mock("../../../contexts/ThemeContext", () => {
  const actual = jest.requireActual("../../../contexts/ThemeContext");
  return { ...actual, useTheme: jest.fn() };
});

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

const useThemeMock = useTheme as jest.MockedFunction<typeof useTheme>;

const setTheme = (isDark: boolean) =>
  useThemeMock.mockReturnValue({
    isDark,
    colors: isDark ? darkColors : lightColors,
    toggleTheme: jest.fn(),
    satelliteMap: false,
    toggleSatelliteMap: jest.fn(),
  });

const makeBooking = (overrides: Partial<Booking> = {}): Booking =>
  ({
    id: "b1",
    tripId: "t1",
    type: "flight",
    title: "Vol Paris — Tokyo",
    date: new Date("2026-03-12T00:00:00Z"),
    status: "confirmed",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  }) as Booking;

const hasViewWithBackground = (color: string) =>
  screen
    .UNSAFE_getAllByType(View)
    .some((view) => flatten(view.props.style).backgroundColor === color);

describe("BookingCard", () => {
  beforeEach(() => {
    setTheme(false);
  });

  it("should render the booking title", () => {
    render(<BookingCard booking={makeBooking()} onPress={jest.fn()} />);

    expect(screen.getByText("Vol Paris — Tokyo")).toBeTruthy();
  });

  it("should render the formatted date alone when no time is set", () => {
    render(<BookingCard booking={makeBooking()} onPress={jest.fn()} />);

    expect(screen.getByText("date(2026-03-12)")).toBeTruthy();
  });

  it("should append the time to the date when a time is set", () => {
    render(<BookingCard booking={makeBooking({ time: "14:30" })} onPress={jest.fn()} />);

    expect(screen.getByText("date(2026-03-12) · 14:30")).toBeTruthy();
  });

  it("should render the translated status badge", () => {
    render(<BookingCard booking={makeBooking()} onPress={jest.fn()} />);

    expect(screen.getByText("statut(confirmed)")).toBeTruthy();
  });

  it("should fall back to an unknown label when the status is missing", () => {
    const booking = makeBooking();
    render(
      <BookingCard
        booking={{ ...booking, status: undefined as unknown as Booking["status"] }}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("common.unknown")).toBeTruthy();
  });

  it("should call onPress when the card is pressed", () => {
    const onPress = jest.fn();
    render(<BookingCard booking={makeBooking()} onPress={onPress} />);

    fireEvent.press(screen.getByText("Vol Paris — Tokyo"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("should render the description when one is set", () => {
    render(
      <BookingCard
        booking={makeBooking({ description: "Départ terminal 2E" })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Départ terminal 2E")).toBeTruthy();
  });

  it("should not render a description row when none is set", () => {
    render(<BookingCard booking={makeBooking()} onPress={jest.fn()} />);

    expect(screen.queryByText("Départ terminal 2E")).toBeNull();
  });

  it("should render the address when one is set", () => {
    render(
      <BookingCard
        booking={makeBooking({ address: "Roissy CDG" })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Roissy CDG")).toBeTruthy();
  });

  it("should render the confirmation number when one is set", () => {
    render(
      <BookingCard
        booking={makeBooking({ confirmationNumber: "AF-99213" })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("AF-99213")).toBeTruthy();
  });

  it("should not render a confirmation row when none is set", () => {
    render(<BookingCard booking={makeBooking()} onPress={jest.fn()} />);

    expect(screen.queryByText("AF-99213")).toBeNull();
  });

  it("should use the light flight palette in light theme", () => {
    render(<BookingCard booking={makeBooking()} onPress={jest.fn()} />);

    expect(screen.UNSAFE_getByProps({ name: "airplane" }).props.color).toBe("#5A8FAA");
  });

  it("should use the dark flight palette in dark theme", () => {
    setTheme(true);
    render(<BookingCard booking={makeBooking()} onPress={jest.fn()} />);

    expect(hasViewWithBackground("rgba(90,143,170,0.22)")).toBe(true);
  });

  it("should fall back to the neutral theme colours for an unmapped booking type", () => {
    render(
      <BookingCard
        booking={makeBooking({ type: "cruise" as unknown as Booking["type"] })}
        onPress={jest.fn()}
      />,
    );

    expect(hasViewWithBackground(lightColors.bgMid)).toBe(true);
  });

  it("should fall back to the neutral status colours for an unmapped status", () => {
    render(
      <BookingCard
        booking={makeBooking({ status: "archived" as unknown as Booking["status"] })}
        onPress={jest.fn()}
      />,
    );

    expect(
      flatten(screen.getByText("statut(archived)").props.style).color,
    ).toBe(lightColors.textMid);
  });
});
