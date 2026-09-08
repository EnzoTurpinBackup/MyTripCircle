jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return { Ionicons: (props: any) => <Text {...props} /> };
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { countIcons, makeAddress, pressIcon } from "../../__tests__/voyagesTestUtils";
import MapMarkerPopup from "../MapMarkerPopup";

const renderPopup = (props: Partial<React.ComponentProps<typeof MapMarkerPopup>> = {}) =>
  render(
    <MapMarkerPopup
      address={makeAddress()}
      onClose={jest.fn()}
      onNavigate={jest.fn()}
      {...props}
    />,
  );

describe("MapMarkerPopup — contenu", () => {
  it("should show the address name and its location", () => {
    renderPopup();

    expect(screen.getByText("Hôtel Miraflores")).toBeTruthy();
    expect(screen.getByText("Lima, Pérou")).toBeTruthy();
  });

  it("should show the street when the address has one", () => {
    renderPopup();

    expect(screen.getByText("12 avenida Larco")).toBeTruthy();
  });

  it("should omit the street line when the address has none", () => {
    renderPopup({ address: makeAddress({ address: "" }) });

    expect(screen.queryByText("12 avenida Larco")).toBeNull();
    expect(screen.getByText("Hôtel Miraflores")).toBeTruthy();
  });

  it.each([
    ["hotel", "Hotels"],
    ["restaurant", "Restaurants"],
    ["activity", "Activities"],
    ["transport", "Transport"],
    ["other", "Other"],
  ])("should tag a %s address with its translated type", (type, label) => {
    renderPopup({ address: makeAddress({ type: type as any }) });

    expect(screen.getByText(label)).toBeTruthy();
  });

  it.each([
    ["hotel", "bed-outline"],
    ["restaurant", "restaurant-outline"],
    ["activity", "ticket-outline"],
    ["transport", "car-outline"],
    ["other", "location-outline"],
  ])("should pick the right icon for a %s address", (type, icon) => {
    renderPopup({ address: makeAddress({ type: type as any }) });

    expect(countIcons(icon)).toBe(1);
  });
});

describe("MapMarkerPopup — actions", () => {
  it("should close when the close button is pressed", () => {
    const onClose = jest.fn();
    renderPopup({ onClose });

    pressIcon("close");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should swallow taps landing inside the popup", () => {
    const onClose = jest.fn();
    renderPopup({ onClose });

    fireEvent.press(screen.getByText("Hôtel Miraflores"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("should navigate to the address details", () => {
    const onNavigate = jest.fn();
    renderPopup({ address: makeAddress({ id: "a42" }), onNavigate });

    fireEvent.press(screen.getByText("Voir les détails"));

    expect(onNavigate).toHaveBeenCalledWith("a42");
  });
});
