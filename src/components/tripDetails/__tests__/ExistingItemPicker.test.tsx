jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return { Ionicons: (props: any) => <Text {...props} /> };
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { countIcons, makeAddress, makeBooking, pressIcon } from "../../__tests__/voyagesTestUtils";
import { ExistingAddressPicker, ExistingBookingPicker } from "../ExistingItemPicker";

describe("ExistingBookingPicker", () => {
  it("should show its title when visible", () => {
    render(
      <ExistingBookingPicker visible bookings={[]} onSelect={jest.fn()} onClose={jest.fn()} />,
    );

    expect(screen.getByText("My bookings")).toBeTruthy();
  });

  it("should render nothing when hidden", () => {
    render(
      <ExistingBookingPicker visible={false} bookings={[]} onSelect={jest.fn()} onClose={jest.fn()} />,
    );

    expect(screen.queryByText("My bookings")).toBeNull();
  });

  it("should show the empty message when no booking is available", () => {
    render(
      <ExistingBookingPicker visible bookings={[]} onSelect={jest.fn()} onClose={jest.fn()} />,
    );

    expect(screen.getByText("No bookings from other trips")).toBeTruthy();
  });

  it("should list a booking with its formatted date", () => {
    render(
      <ExistingBookingPicker
        visible
        bookings={[makeBooking({ title: "Paris → Lima" })]}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("Paris → Lima")).toBeTruthy();
    expect(screen.getByText("Mar 15, 2026")).toBeTruthy();
  });

  it("should append the address to the date when the booking has one", () => {
    render(
      <ExistingBookingPicker
        visible
        bookings={[makeBooking({ address: "CDG Terminal 2" })]}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("Mar 15, 2026 · CDG Terminal 2")).toBeTruthy();
  });

  it("should select the booking that is tapped", () => {
    const onSelect = jest.fn();
    const booking = makeBooking({ title: "Paris → Lima" });
    render(
      <ExistingBookingPicker visible bookings={[booking]} onSelect={onSelect} onClose={jest.fn()} />,
    );

    fireEvent.press(screen.getByText("Paris → Lima"));

    expect(onSelect).toHaveBeenCalledWith(booking);
  });

  it("should close when the header button is pressed", () => {
    const onClose = jest.fn();
    render(
      <ExistingBookingPicker visible bookings={[]} onSelect={jest.fn()} onClose={onClose} />,
    );

    pressIcon("close");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["flight", "airplane"],
    ["hotel", "bed"],
    ["train", "train"],
    ["restaurant", "restaurant"],
    ["activity", "star"],
    ["unknown", "receipt"],
  ])("should pick the right icon for a %s booking", (type, icon) => {
    render(
      <ExistingBookingPicker
        visible
        bookings={[makeBooking({ type: type as any })]}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(countIcons(icon)).toBe(1);
  });
});

describe("ExistingAddressPicker", () => {
  it("should show its title when visible", () => {
    render(
      <ExistingAddressPicker visible addresses={[]} onSelect={jest.fn()} onClose={jest.fn()} />,
    );

    expect(screen.getByText("My addresses")).toBeTruthy();
  });

  it("should render nothing when hidden", () => {
    render(
      <ExistingAddressPicker visible={false} addresses={[]} onSelect={jest.fn()} onClose={jest.fn()} />,
    );

    expect(screen.queryByText("My addresses")).toBeNull();
  });

  it("should show the empty message when no address is available", () => {
    render(
      <ExistingAddressPicker visible addresses={[]} onSelect={jest.fn()} onClose={jest.fn()} />,
    );

    expect(screen.getByText("No addresses from other trips")).toBeTruthy();
  });

  it("should list an address with its city and country", () => {
    render(
      <ExistingAddressPicker
        visible
        addresses={[makeAddress()]}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("Hôtel Miraflores")).toBeTruthy();
    expect(screen.getByText("Lima, Pérou")).toBeTruthy();
  });

  it("should drop the empty parts of the location line", () => {
    render(
      <ExistingAddressPicker
        visible
        addresses={[makeAddress({ city: "", country: "Pérou" })]}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("Pérou")).toBeTruthy();
  });

  it("should select the address that is tapped", () => {
    const onSelect = jest.fn();
    const address = makeAddress();
    render(
      <ExistingAddressPicker visible addresses={[address]} onSelect={onSelect} onClose={jest.fn()} />,
    );

    fireEvent.press(screen.getByText("Hôtel Miraflores"));

    expect(onSelect).toHaveBeenCalledWith(address);
  });

  it("should close when the header button is pressed", () => {
    const onClose = jest.fn();
    render(
      <ExistingAddressPicker visible addresses={[]} onSelect={jest.fn()} onClose={onClose} />,
    );

    pressIcon("close");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["hotel", "bed"],
    ["restaurant", "restaurant"],
    ["activity", "star"],
    ["transport", "location"],
    ["other", "location"],
  ])("should pick the right icon for a %s address", (type, icon) => {
    render(
      <ExistingAddressPicker
        visible
        addresses={[makeAddress({ type: type as any })]}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(countIcons(icon)).toBe(1);
  });
});
