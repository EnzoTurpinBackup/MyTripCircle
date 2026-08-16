import "../../__tests__/support/nativeMocks";

import React from "react";
import { ActivityIndicator, View } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import AddressMapWidget from "../AddressMapWidget";
import * as useAddressesModule from "../../../hooks/useAddresses";
import { SKY } from "../addressHelpers";
import { useTheme, lightColors, darkColors } from "../../../contexts/ThemeContext";
import type { Address } from "../../../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// `useAddresses` charge react-native-maps et la navigation : seule la surface
// cartographique consommée par le widget est nécessaire ici.
jest.mock("../../../hooks/useAddresses", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    mapsAvailable: true,
    MapView: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View testID="map-view" {...props}>
        {children}
      </View>
    ),
    Marker: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View testID="map-marker" {...props}>
        {children}
      </View>
    ),
  };
});

jest.mock("../../../contexts/ThemeContext", () => {
  const actual = jest.requireActual("../../../contexts/ThemeContext");
  return { ...actual, useTheme: jest.fn() };
});

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

/** Les pastilles de marqueur n'ont pas de testID : on les reconnaît à leur fond. */
const hasViewWithBackground = (color: string) =>
  screen
    .UNSAFE_getAllByType(View)
    .some((view) => flatten(view.props.style).backgroundColor === color);

const useThemeMock = useTheme as jest.MockedFunction<typeof useTheme>;

const setTheme = (isDark: boolean) =>
  useThemeMock.mockReturnValue({
    isDark,
    colors: isDark ? darkColors : lightColors,
    toggleTheme: jest.fn(),
    satelliteMap: false,
    toggleSatelliteMap: jest.fn(),
  });

/** `mapsAvailable` est lu à chaque rendu : on le pilote via le module mocké. */
const setMapsAvailable = (available: boolean) => {
  Object.defineProperty(useAddressesModule, "mapsAvailable", {
    value: available,
    configurable: true,
  });
};

const REGION = {
  latitude: 35.01,
  longitude: 135.76,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

const ADDRESSES = [
  { id: "a1", name: "Hôtel Sakura", type: "hotel" },
  { id: "a2", name: "Chez Toshi", type: "restaurant" },
] as Address[];

const renderWidget = (
  overrides: Partial<React.ComponentProps<typeof AddressMapWidget>> = {},
) => {
  const onOpenFullMap = overrides.onOpenFullMap ?? jest.fn();
  render(
    <AddressMapWidget
      addresses={ADDRESSES}
      mapCoords={{ a1: { latitude: 35.01, longitude: 135.76 } }}
      isGeocoding={false}
      widgetRegion={REGION}
      {...overrides}
      onOpenFullMap={onOpenFullMap}
    />,
  );
  return { onOpenFullMap };
};

describe("AddressMapWidget", () => {
  beforeEach(() => {
    setTheme(false);
    setMapsAvailable(true);
  });

  it("should render the map when the native module is available", () => {
    renderWidget();

    expect(screen.getByTestId("map-view")).toBeTruthy();
  });

  it("should render a marker for each geocoded address", () => {
    renderWidget({
      mapCoords: {
        a1: { latitude: 35.01, longitude: 135.76 },
        a2: { latitude: 35.02, longitude: 135.77 },
      },
    });

    expect(screen.getAllByTestId("map-marker")).toHaveLength(2);
  });

  it("should skip coordinates whose address is no longer in the list", () => {
    renderWidget({
      mapCoords: {
        a1: { latitude: 35.01, longitude: 135.76 },
        disparue: { latitude: 0, longitude: 0 },
      },
    });

    expect(screen.getAllByTestId("map-marker")).toHaveLength(1);
  });

  it("should colour the marker pin after the address type", () => {
    renderWidget();

    expect(screen.UNSAFE_getByProps({ name: "bed-outline" })).toBeTruthy();
    expect(hasViewWithBackground(SKY)).toBe(true);
  });

  it("should show the placeholder instead of the map when the native module is missing", () => {
    setMapsAvailable(false);
    renderWidget();

    expect(screen.queryByTestId("map-view")).toBeNull();
    expect(screen.getByText("Rebuild requis")).toBeTruthy();
  });

  it("should show the geocoding spinner while addresses are being located", () => {
    renderWidget({ isGeocoding: true });

    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it("should hide the geocoding spinner once geocoding is done", () => {
    renderWidget({ isGeocoding: false });

    expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  });

  it("should hide the geocoding spinner when the map is unavailable", () => {
    setMapsAvailable(false);
    renderWidget({ isGeocoding: true });

    expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  });

  it("should show how many addresses are placed on the map", () => {
    renderWidget({
      mapCoords: {
        a1: { latitude: 35.01, longitude: 135.76 },
        a2: { latitude: 35.02, longitude: 135.77 },
      },
    });

    expect(screen.getByText("2")).toBeTruthy();
  });

  it("should hide the counter badge when no address is placed", () => {
    renderWidget({ mapCoords: {} });

    expect(screen.queryByText("0")).toBeNull();
  });

  it("should hide the counter badge when the map is unavailable", () => {
    setMapsAvailable(false);
    renderWidget();

    expect(screen.queryByText("1")).toBeNull();
  });

  it("should open the full map when the see-all shortcut is pressed", () => {
    const { onOpenFullMap } = renderWidget();

    fireEvent.press(screen.getByText("addresses.seeMap →"));

    expect(onOpenFullMap).toHaveBeenCalledTimes(1);
  });

  it("should open the full map when the map surface itself is pressed", () => {
    const { onOpenFullMap } = renderWidget();

    fireEvent.press(screen.getByText("addresses.seeMap →").parent!);

    expect(onOpenFullMap).toHaveBeenCalledTimes(1);
  });

  it("should keep the default map style in light theme", () => {
    renderWidget();

    expect(screen.getByTestId("map-view").props.customMapStyle).toEqual([]);
  });

  it("should apply the dark map style in dark theme", () => {
    setTheme(true);
    renderWidget();

    expect(screen.getByTestId("map-view").props.customMapStyle.length).toBeGreaterThan(0);
  });
});
