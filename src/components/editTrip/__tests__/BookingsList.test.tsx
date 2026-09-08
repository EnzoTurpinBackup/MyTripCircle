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
import { countIcons, listColors, makeBooking, pressIcon } from "../../__tests__/voyagesTestUtils";
import BookingsList from "../BookingsList";

const renderList = (props: Partial<React.ComponentProps<typeof BookingsList>> = {}) =>
  render(
    <BookingsList
      bookings={[]}
      colors={listColors}
      onAdd={jest.fn()}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
      {...props}
    />,
  );

beforeEach(() => {
  mockIsDark = false;
});

describe("BookingsList — en-tête", () => {
  it("should show the section header", () => {
    renderList();

    expect(screen.getByText("Bookings")).toBeTruthy();
  });

  it("should trigger the add handler", () => {
    const onAdd = jest.fn();
    renderList({ onAdd });

    fireEvent.press(screen.getByText("Add Booking"));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});

describe("BookingsList — état vide", () => {
  it("should invite the user to add a first booking", () => {
    renderList();

    expect(screen.getByText("Add your first booking to get started")).toBeTruthy();
  });
});

describe("BookingsList — liste", () => {
  it("should show the booking title and its formatted date", () => {
    renderList({ bookings: [makeBooking()] });

    expect(screen.getByText("Paris → Lima")).toBeTruthy();
    expect(screen.getByText("Mar 15, 2026")).toBeTruthy();
  });

  it("should append the time when the booking has one", () => {
    renderList({ bookings: [makeBooking({ time: "08:05" })] });

    expect(screen.getByText("Mar 15, 2026 · 08:05")).toBeTruthy();
  });

  it("should render a booking that has no id", () => {
    renderList({ bookings: [makeBooking({ id: "" })] });

    expect(screen.getByText("Paris → Lima")).toBeTruthy();
  });

  it("should hide the empty message once there is a booking", () => {
    renderList({ bookings: [makeBooking()] });

    expect(screen.queryByText("Add your first booking to get started")).toBeNull();
  });

  it.each([
    ["flight", "airplane"],
    ["train", "train"],
    ["hotel", "bed"],
    ["restaurant", "restaurant"],
    ["activity", "ticket"],
  ])("should pick the right icon for a %s booking", (type, icon) => {
    renderList({ bookings: [makeBooking({ type: type as any })] });

    expect(countIcons(icon)).toBe(1);
  });

  it("should fall back to the receipt icon for an unknown type", () => {
    renderList({ bookings: [makeBooking({ type: "cruise" as any })] });

    expect(countIcons("receipt")).toBe(1);
  });

  it.each(["flight", "train", "hotel", "restaurant", "activity"])(
    "should render a %s booking in dark mode",
    (type) => {
      mockIsDark = true;
      renderList({ bookings: [makeBooking({ type: type as any, title: `Trajet ${type}` })] });

      expect(screen.getByText(`Trajet ${type}`)).toBeTruthy();
    },
  );

  it("should render an unknown type in dark mode too", () => {
    mockIsDark = true;
    renderList({ bookings: [makeBooking({ type: "cruise" as any })] });

    expect(countIcons("receipt")).toBe(1);
  });
});

describe("BookingsList — actions par ligne", () => {
  it("should edit the booking at the pressed index", () => {
    const onEdit = jest.fn();
    renderList({
      bookings: [makeBooking({ id: "b1" }), makeBooking({ id: "b2", title: "Hôtel" })],
      onEdit,
    });

    pressIcon("pencil", 1);

    expect(onEdit).toHaveBeenCalledWith(1);
  });

  it("should delete the booking at the pressed index", () => {
    const onDelete = jest.fn();
    renderList({
      bookings: [makeBooking({ id: "b1" }), makeBooking({ id: "b2", title: "Hôtel" })],
      onDelete,
    });

    pressIcon("trash", 0);

    expect(onDelete).toHaveBeenCalledWith(0);
  });
});

describe("BookingsList — accessibilité", () => {
  it("should name the edit button after the booking it acts on", () => {
    renderList({ bookings: [makeBooking({ title: "Paris → Lima" })] });

    expect(screen.getByLabelText("Edit Paris → Lima").props.accessibilityRole).toBe("button");
  });

  it("should name the delete button after the booking it acts on", () => {
    renderList({ bookings: [makeBooking({ title: "Paris → Lima" })] });

    expect(screen.getByLabelText("Delete Paris → Lima").props.accessibilityRole).toBe("button");
  });

  it("should hide the booking type pictogram, already described by the row text", () => {
    renderList({ bookings: [makeBooking({ type: "flight" })] });

    expect(screen.UNSAFE_getAllByProps({ name: "airplane" })[0].props).toMatchObject({
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: "no",
    });
  });
});
