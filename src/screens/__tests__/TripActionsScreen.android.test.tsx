// Suite dédiée à la variante Android du bandeau de couverture. Sa hauteur et le
// retrait du bouton retour sont figés à l'évaluation de la feuille de styles,
// au chargement du module : ils ne peuvent pas être couverts depuis la suite
// principale, qui s'exécute sur la plateforme iOS par défaut de jest-expo.

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

import { hostParent } from "./support/tripScreenMocks";

import React from "react";
import { render, screen } from "@testing-library/react-native";

import TripActionsScreen from "../TripActionsScreen";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({
    params: {
      tripId: "t1",
      tripTitle: "Pérou 2026",
      destination: "Lima",
      startDate: "2026-03-15T12:00:00.000Z",
      endDate: "2026-03-25T12:00:00.000Z",
      coverImage: "https://cdn/lima.jpg",
      totalBookings: 3,
      totalAddresses: 5,
      isOwner: true,
    },
  }),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), dispatch: jest.fn() }),
  CommonActions: { reset: jest.fn() },
}));

jest.mock("../../contexts/TripsContext", () => ({ useTrips: () => ({ deleteTrip: jest.fn() }) }));
jest.mock("../../contexts/NetworkContext", () => ({ useNetwork: () => ({ isConnected: true }) }));
jest.mock("../../contexts/ThemeContext", () => {
  const actual = jest.requireActual("../../contexts/ThemeContext");
  return { ...actual, useTheme: () => ({ colors: actual.lightColors, isDark: false }) };
});

jest.mock("../../services/ApiService", () => ({
  __esModule: true,
  default: { getTripInvitationLink: jest.fn() },
}));

jest.mock("../../utils/i18n", () => ({
  formatDate: (date: Date) => date.toISOString().slice(0, 10),
  parseApiError: () => "",
}));

const HERO_VEIL_TEST_ID = "gradient:rgba(0,0,0,0.10)/rgba(0,0,0,0.72)";

describe("TripActionsScreen sur Android", () => {
  it("should shorten the hero banner when running on Android", () => {
    // Arrange & Act
    render(<TripActionsScreen />);

    // Assert
    expect(hostParent(screen.getByTestId(HERO_VEIL_TEST_ID))).toHaveStyle({ height: 280 });
  });

  it("should pad the back button below the Android status bar", () => {
    // Arrange & Act
    render(<TripActionsScreen />);

    // Assert
    expect(hostParent(screen.getByRole("button", { name: "common.a11y.back" }))).toHaveStyle({
      paddingTop: 12,
    });
  });
});
