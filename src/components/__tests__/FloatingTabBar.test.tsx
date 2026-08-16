import "./support/nativeMocks";

import React from "react";
import { Animated, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { FloatingTabBar } from "../FloatingTabBar";
import { lightColors } from "../../contexts/ThemeContext";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

type TabOptions = { tabBarAccessibilityLabel?: string; tabBarTestID?: string };

const buildProps = ({
  routeNames = ["Trips", "Bookings"],
  index = 0,
  options = {} as Record<string, TabOptions>,
  emit = jest.fn(() => ({ defaultPrevented: false })),
  navigate = jest.fn(),
}: {
  routeNames?: string[];
  index?: number;
  options?: Record<string, TabOptions>;
  emit?: jest.Mock;
  navigate?: jest.Mock;
} = {}) => {
  const routes = routeNames.map((name) => ({ key: `${name}-key`, name }));
  const descriptors = Object.fromEntries(
    routes.map((route) => [route.key, { options: options[route.name] ?? {} }]),
  );
  return {
    state: { index, routes },
    descriptors,
    navigation: { emit, navigate },
    emit,
    navigate,
  } as unknown as BottomTabBarProps & { emit: jest.Mock; navigate: jest.Mock };
};

const renderTabBar = (
  props: ReturnType<typeof buildProps>,
  insets = { top: 0, bottom: 0, left: 0, right: 0 },
) =>
  render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 640 }, insets }}
    >
      <FloatingTabBar {...props} />
    </SafeAreaProvider>,
  );

describe("FloatingTabBar", () => {
  let springSpy: jest.SpyInstance;

  beforeEach(() => {
    // La transition du pip est neutralisée : elle laisserait des animations en
    // vol après chaque test et ne change rien aux comportements observés.
    springSpy = jest
      .spyOn(Animated, "spring")
      .mockReturnValue({ start: jest.fn() } as unknown as Animated.CompositeAnimation);
  });

  afterEach(() => {
    springSpy.mockRestore();
  });

  it("should render a translated label for each known tab", () => {
    renderTabBar(buildProps({ routeNames: ["Trips", "Bookings", "Addresses", "Ideas", "Profile"] }));

    ["trips", "bookings", "addresses", "ideas", "profile"].forEach((tab) => {
      expect(screen.getByText(`tabs.${tab}`)).toBeTruthy();
    });
  });

  it("should fall back to the route name for an unmapped tab", () => {
    renderTabBar(buildProps({ routeNames: ["Trips", "Réglages"] }));

    expect(screen.getByText("Réglages")).toBeTruthy();
  });

  it("should render the filled icon for the focused tab", () => {
    renderTabBar(buildProps({ index: 0 }));

    expect(screen.UNSAFE_getByProps({ name: "airplane" })).toBeTruthy();
  });

  it("should render the outline icon for unfocused tabs", () => {
    renderTabBar(buildProps({ index: 0 }));

    expect(screen.UNSAFE_getByProps({ name: "calendar-outline" })).toBeTruthy();
  });

  it("should fall back to the help icon for an unmapped tab", () => {
    renderTabBar(buildProps({ routeNames: ["Trips", "Réglages"], index: 0 }));

    expect(screen.UNSAFE_getByProps({ name: "help-outline" })).toBeTruthy();
  });

  it("should render the filled help icon when an unmapped tab is focused", () => {
    renderTabBar(buildProps({ routeNames: ["Trips", "Réglages"], index: 1 }));

    expect(screen.UNSAFE_getByProps({ name: "help" })).toBeTruthy();
  });

  it("should mark the focused tab as selected for assistive technologies", () => {
    renderTabBar(
      buildProps({ index: 0, options: { Trips: { tabBarTestID: "tab-trips" } } }),
    );

    expect(screen.getByTestId("tab-trips").props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it("should not mark unfocused tabs as selected", () => {
    renderTabBar(
      buildProps({ index: 0, options: { Bookings: { tabBarTestID: "tab-bookings" } } }),
    );

    expect(screen.getByTestId("tab-bookings").props.accessibilityState).toEqual({});
  });

  it("should forward the tab accessibility label when the navigator provides one", () => {
    renderTabBar(
      buildProps({ options: { Bookings: { tabBarAccessibilityLabel: "Mes réservations" } } }),
    );

    expect(screen.getByLabelText("Mes réservations")).toBeTruthy();
  });

  it("should emit a tabPress event when a tab is pressed", () => {
    const props = buildProps({ options: { Bookings: { tabBarTestID: "tab-bookings" } } });
    renderTabBar(props);

    fireEvent.press(screen.getByTestId("tab-bookings"));

    expect(props.emit).toHaveBeenCalledWith({
      type: "tabPress",
      target: "Bookings-key",
      canPreventDefault: true,
    });
  });

  it("should navigate to an unfocused tab when it is pressed", () => {
    const props = buildProps({
      index: 0,
      options: { Bookings: { tabBarTestID: "tab-bookings" } },
    });
    renderTabBar(props);

    fireEvent.press(screen.getByTestId("tab-bookings"));

    expect(props.navigate).toHaveBeenCalledWith("Bookings");
  });

  it("should not navigate when the already focused tab is pressed", () => {
    const props = buildProps({
      index: 0,
      options: { Trips: { tabBarTestID: "tab-trips" } },
    });
    renderTabBar(props);

    fireEvent.press(screen.getByTestId("tab-trips"));

    expect(props.navigate).not.toHaveBeenCalled();
  });

  it("should not navigate when a listener prevents the default tabPress behaviour", () => {
    const props = buildProps({
      index: 0,
      options: { Bookings: { tabBarTestID: "tab-bookings" } },
      emit: jest.fn(() => ({ defaultPrevented: true })),
    });
    renderTabBar(props);

    fireEvent.press(screen.getByTestId("tab-bookings"));

    expect(props.navigate).not.toHaveBeenCalled();
  });

  it("should emit a tabLongPress event on a long press", () => {
    const props = buildProps({ options: { Bookings: { tabBarTestID: "tab-bookings" } } });
    renderTabBar(props);

    fireEvent(screen.getByTestId("tab-bookings"), "longPress");

    expect(props.emit).toHaveBeenCalledWith({
      type: "tabLongPress",
      target: "Bookings-key",
    });
  });

  it("should apply a minimum bottom gap when the device has no bottom inset", () => {
    renderTabBar(buildProps());

    expect(flatten(screen.UNSAFE_getAllByType(View)[0].props.style).paddingBottom).toBe(12);
  });

  it("should honour a bottom inset larger than the minimum gap", () => {
    renderTabBar(buildProps(), { top: 0, bottom: 34, left: 0, right: 0 });

    expect(flatten(screen.UNSAFE_getAllByType(View)[0].props.style).paddingBottom).toBe(34);
  });

  it("should tint the focused tab label with the accent colour", () => {
    renderTabBar(buildProps({ index: 0 }));

    expect(flatten(screen.getByText("tabs.trips").props.style).color).toBe(
      lightColors.terra,
    );
  });

  it("should tint unfocused tab labels with the muted colour", () => {
    renderTabBar(buildProps({ index: 0 }));

    expect(flatten(screen.getByText("tabs.bookings").props.style).color).toBe(
      lightColors.textLight,
    );
  });
});
