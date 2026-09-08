import "./support/screenMocks";

import React from "react";
import { render, screen } from "@testing-library/react-native";

import ConsentScreen from "../ConsentScreen";
import { lightColors } from "../../contexts/ThemeContext";
import { useTheme } from "../../contexts/ThemeContext";

// On renvoie la clé de traduction plutôt que le libellé : les assertions
// restent lisibles et insensibles aux retouches de wording.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: jest.fn(),
}));

jest.mock("expo-location", () => ({ requestForegroundPermissionsAsync: jest.fn() }));

jest.mock("../../hooks/usePushNotifications", () => ({
  requestPermissionAndRegisterToken: jest.fn(),
}));

describe("ConsentScreen", () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      isDark: false,
      colors: lightColors,
      toggleTheme: jest.fn(),
      satelliteMap: false,
      toggleSatelliteMap: jest.fn(),
    });
  });

  it("should render the consent title when mounted", () => {
    render(<ConsentScreen />);

    expect(screen.getByText("consent.title")).toBeTruthy();
  });

  it("should label the application logo when mounted", () => {
    render(<ConsentScreen />);

    expect(screen.getByLabelText("common.a11y.appLogo")).toBeTruthy();
  });
});
