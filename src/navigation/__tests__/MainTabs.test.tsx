import "../../screens/__tests__/support/screenMocks";

import React from "react";
import { render } from "@testing-library/react-native";

import MainTabs from "../tabs/MainTabs";
import { FloatingTabBar } from "../../components/FloatingTabBar";

jest.mock("react-i18next", () => ({
  ...jest.requireActual("react-i18next"),
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Le navigateur d'onglets est remplacé par une sonde : on veut lire la table
// d'onglets et la fonction `tabBar` telles que React Navigation les recevra,
// sans monter les cinq écrans qu'elles référencent.
let navigatorProps: NavigatorProps | undefined;

interface TabScreen {
  props: { name: string; component?: unknown; options?: { title?: string; headerShown?: boolean } };
}

interface NavigatorProps {
  tabBar: (props: Record<string, unknown>) => React.ReactElement;
  children: React.ReactNode;
}

jest.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: () => ({
    Navigator: (props: NavigatorProps) => {
      navigatorProps = props;
      return null;
    },
    Screen: () => null,
  }),
}));

const tabsOf = () => React.Children.toArray(navigatorProps?.children) as unknown as TabScreen[];

describe("MainTabs", () => {
  beforeEach(() => {
    navigatorProps = undefined;
  });

  it("should declare the five tabs in their display order", () => {
    // Arrange & Act
    render(<MainTabs />);

    // Assert
    expect(tabsOf().map((tab) => tab.props.name)).toEqual([
      "Trips",
      "Bookings",
      "Ideas",
      "Addresses",
      "Profile",
    ]);
  });

  it("should label every tab from the translation catalogue", () => {
    // Arrange & Act
    render(<MainTabs />);

    // Assert
    expect(tabsOf().map((tab) => tab.props.options?.title)).toEqual([
      "tabs.myTrips",
      "tabs.bookings",
      "tabs.ideas",
      "tabs.addresses",
      "tabs.profile",
    ]);
  });

  it("should hide the native header on every tab", () => {
    // Arrange & Act
    render(<MainTabs />);

    // Assert
    tabsOf().forEach((tab) => {
      expect(tab.props.options?.headerShown).toBe(false);
      expect(tab.props.component).toBeTruthy();
    });
  });

  describe("barre d'onglets flottante", () => {
    it("should render the floating tab bar from the tabBar callback", () => {
      // Arrange
      render(<MainTabs />);

      // Act — React Navigation v7 appelle `tabBar` comme une fonction ordinaire.
      const bar = navigatorProps!.tabBar({ state: { index: 0, routes: [] } });

      // Assert
      expect(bar.type).toBe(FloatingTabBar);
    });

    it("should forward the navigator props untouched to the tab bar", () => {
      // Arrange
      render(<MainTabs />);
      const props = { state: { index: 2, routes: [] } };

      // Act
      const bar = navigatorProps!.tabBar(props);

      // Assert
      expect(bar.props).toEqual(props);
    });

    it("should keep the same tabBar reference across renders", () => {
      // Arrange
      render(<MainTabs />);
      const first = navigatorProps!.tabBar;

      // Act
      render(<MainTabs />);

      // Assert — une nouvelle référence à chaque rendu remonterait la barre et
      // ferait appeler `FloatingTabBar` hors composant, violant les Rules of
      // Hooks : c'est la raison d'être de la fonction définie hors du composant.
      expect(navigatorProps!.tabBar).toBe(first);
    });
  });
});
