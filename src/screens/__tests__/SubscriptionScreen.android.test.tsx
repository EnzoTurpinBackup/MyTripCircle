// Suite dédiée à la variante Android du lien de gestion de l'abonnement.
// L'URL est choisie au chargement du module : elle ne peut pas être couverte
// depuis la suite principale, qui s'exécute sur la plateforme iOS par défaut de
// jest-expo.

import "./support/androidPlatform";
import "./support/screenMocks";

import React from "react";
import { Linking } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import SubscriptionScreen from "../SubscriptionScreen";
import { lightColors, useTheme } from "../../contexts/ThemeContext";
import { useSubscription } from "../../contexts/SubscriptionContext";
import { useSubscriptionIap } from "../../hooks/useSubscriptionIap";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: jest.fn(),
}));

jest.mock("../../contexts/SubscriptionContext", () => ({ useSubscription: jest.fn() }));
jest.mock("../../hooks/useSubscriptionIap", () => ({ useSubscriptionIap: jest.fn() }));
jest.mock("../../utils/i18n", () => ({ formatDate: (iso: string) => iso }));

describe("SubscriptionScreen sur Android", () => {
  it("should open the Play Store subscriptions page when the manage button is pressed", () => {
    // Arrange
    (useTheme as jest.Mock).mockReturnValue({ colors: lightColors });
    (useSubscriptionIap as jest.Mock).mockReturnValue({
      products: [],
      loadingId: null,
      onSubscribe: jest.fn(),
      isExpoGo: false,
    });
    (useSubscription as jest.Mock).mockReturnValue({
      isPremium: () => true,
      subscription: null,
    });
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    render(<SubscriptionScreen />);

    // Act
    fireEvent.press(screen.getByText("subscription.manageButton"));

    // Assert
    expect(openURL).toHaveBeenCalledWith(
      "https://play.google.com/store/account/subscriptions",
    );
  });
});
