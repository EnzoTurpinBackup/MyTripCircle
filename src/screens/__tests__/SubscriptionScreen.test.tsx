import "./support/screenMocks";

import React from "react";
import { Linking, ScrollView } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import SubscriptionScreen from "../SubscriptionScreen";
import { lightColors, useTheme } from "../../contexts/ThemeContext";
import { useSubscription } from "../../contexts/SubscriptionContext";
import { useSubscriptionIap } from "../../hooks/useSubscriptionIap";
import { useNavigation } from "@react-navigation/native";

// `t` renvoie la clé ; les valeurs interpolées sont concaténées après un `|`
// afin de vérifier qu'une date atteint bien le message d'échéance.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}|${Object.values(options).join(",")}` : key,
  }),
}));

jest.mock("@react-navigation/native", () => ({ useNavigation: jest.fn() }));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: jest.fn(),
}));

jest.mock("../../contexts/SubscriptionContext", () => ({ useSubscription: jest.fn() }));

jest.mock("../../hooks/useSubscriptionIap", () => ({ useSubscriptionIap: jest.fn() }));

jest.mock("../../utils/i18n", () => ({ formatDate: jest.fn((iso: string) => `formaté(${iso})`) }));

const goBack = jest.fn();
const onSubscribe = jest.fn();

const MONTHLY = { productId: "premium_monthly", title: "Premium mensuel", localizedPrice: "4,99 €" };
const ANNUAL = { productId: "premium_annual", title: "Premium annuel", localizedPrice: "49,99 €" };

const setIap = (overrides: Record<string, unknown> = {}) => {
  (useSubscriptionIap as jest.Mock).mockReturnValue({
    products: [MONTHLY, ANNUAL],
    loadingId: null,
    onSubscribe,
    isExpoGo: false,
    ...overrides,
  });
};

const setSubscription = (overrides: Record<string, unknown> = {}) => {
  (useSubscription as jest.Mock).mockReturnValue({
    isPremium: () => false,
    subscription: null,
    ...overrides,
  });
};

describe("SubscriptionScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ goBack });
    (useTheme as jest.Mock).mockReturnValue({ colors: lightColors });
    setIap();
    setSubscription();
  });

  describe("catalogue des offres", () => {
    it("should label the first offer as a monthly price", () => {
      // Arrange & Act
      render(<SubscriptionScreen />);

      // Assert
      expect(screen.getByText("subscription.perMonth")).toBeTruthy();
    });

    it("should label the second offer as a yearly price", () => {
      // Arrange & Act
      render(<SubscriptionScreen />);

      // Assert
      expect(screen.getByText("subscription.perYear")).toBeTruthy();
    });

    it("should label every offer after the first one as a yearly price", () => {
      // Arrange
      setIap({ products: [MONTHLY, ANNUAL, { ...ANNUAL, productId: "premium_lifetime" }] });

      // Act
      render(<SubscriptionScreen />);

      // Assert
      expect(screen.getAllByText("subscription.perYear")).toHaveLength(2);
      expect(screen.getAllByText("subscription.perMonth")).toHaveLength(1);
    });

    it("should render one card per available offer", () => {
      // Arrange & Act
      render(<SubscriptionScreen />);

      // Assert
      expect(screen.getByText("Premium mensuel")).toBeTruthy();
      expect(screen.getByText("Premium annuel")).toBeTruthy();
    });

    it("should fall back to the product id when the offer has no title", () => {
      // Arrange
      setIap({ products: [{ ...MONTHLY, title: "" }] });

      // Act
      render(<SubscriptionScreen />);

      // Assert
      expect(screen.getByText("premium_monthly")).toBeTruthy();
    });

    it("should list the monthly advantages on the first offer", () => {
      // Arrange & Act
      render(<SubscriptionScreen />);

      // Assert
      expect(screen.getByText("subscription.monthlyAdvantage1")).toBeTruthy();
      expect(screen.getByText("subscription.annualAdvantage5")).toBeTruthy();
    });

    it("should mark the second offer as recommended", () => {
      // Arrange & Act
      render(<SubscriptionScreen />);

      // Assert
      expect(screen.getAllByText("subscription.recommended")).toHaveLength(1);
    });

    it("should subscribe to the offer whose button is pressed", () => {
      // Arrange
      render(<SubscriptionScreen />);

      // Act
      fireEvent.press(screen.getAllByLabelText("subscription.subscribe")[1]);

      // Assert
      expect(onSubscribe).toHaveBeenCalledWith("premium_annual");
    });

    it("should show the loading state only on the offer being purchased", () => {
      // Arrange
      setIap({ loadingId: "premium_annual" });

      // Act
      render(<SubscriptionScreen />);

      // Assert
      expect(screen.getByLabelText("common.loading")).toBeTruthy();
      expect(screen.getAllByLabelText("subscription.subscribe")).toHaveLength(1);
    });

    it("should render the default features card when the user is not premium", () => {
      // Arrange & Act
      render(<SubscriptionScreen />);

      // Assert
      expect(screen.queryByText("subscription.premiumAdvantagesTitle")).toBeNull();
    });
  });

  describe("bandeau mode démo", () => {
    it("should warn about the demo mode when running inside Expo Go", () => {
      // Arrange
      setIap({ isExpoGo: true });

      // Act
      render(<SubscriptionScreen />);

      // Assert
      expect(screen.getByText("subscription.demoMode")).toBeTruthy();
      expect(screen.getByText("subscription.demoMessage")).toBeTruthy();
    });

    it("should hide the demo banner outside Expo Go", () => {
      // Arrange & Act
      render(<SubscriptionScreen />);

      // Assert
      expect(screen.queryByText("subscription.demoMode")).toBeNull();
    });
  });

  describe("abonnement actif", () => {
    const renderPremium = (subscription: Record<string, unknown> | null) => {
      setSubscription({ isPremium: () => true, subscription });
      render(<SubscriptionScreen />);
    };

    it("should replace the offers by the active banner when the user is premium", () => {
      // Arrange & Act
      renderPremium(null);

      // Assert
      expect(screen.getByText("subscription.activeBannerTitle")).toBeTruthy();
      expect(screen.queryByText("Premium mensuel")).toBeNull();
    });

    it("should render the premium features card when the user is premium", () => {
      // Arrange & Act
      renderPremium(null);

      // Assert
      expect(screen.getByText("subscription.premiumAdvantagesTitle")).toBeTruthy();
    });

    it("should state the subscription is active when no subscription detail is known", () => {
      // Arrange & Act
      renderPremium(null);

      // Assert
      expect(screen.getByText("subscription.activeBannerActive")).toBeTruthy();
    });

    it("should announce the end date when the subscription is cancelled", () => {
      // Arrange & Act
      renderPremium({ status: "cancelled", endDate: "2026-09-01" });

      // Assert
      expect(
        screen.getByText("subscription.activeBannerCancelledUntil|formaté(2026-09-01)"),
      ).toBeTruthy();
    });

    it("should announce the next billing date when the subscription renews", () => {
      // Arrange & Act
      renderPremium({ status: "active", nextBillingDate: "2026-09-15" });

      // Assert
      expect(
        screen.getByText("subscription.activeBannerNextBilling|formaté(2026-09-15)"),
      ).toBeTruthy();
    });

    it("should announce the next billing date even for a cancelled subscription without end date", () => {
      // Arrange & Act
      renderPremium({ status: "cancelled", nextBillingDate: "2026-09-15" });

      // Assert
      expect(
        screen.getByText("subscription.activeBannerNextBilling|formaté(2026-09-15)"),
      ).toBeTruthy();
    });

    it("should state the subscription is active when no date is known", () => {
      // Arrange & Act
      renderPremium({ status: "active" });

      // Assert
      expect(screen.getByText("subscription.activeBannerActive")).toBeTruthy();
    });

    it("should open the store subscriptions page when the manage button is pressed", () => {
      // Arrange
      const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
      renderPremium(null);

      // Act
      fireEvent.press(screen.getByText("subscription.manageButton"));

      // Assert
      expect(openURL).toHaveBeenCalledWith("https://apps.apple.com/account/subscriptions");
    });

    it("should swallow the error when the store page cannot be opened", async () => {
      // Arrange
      const openURL = jest
        .spyOn(Linking, "openURL")
        .mockRejectedValue(new Error("aucune application"));
      renderPremium(null);

      // Act
      fireEvent.press(screen.getByText("subscription.manageButton"));

      // Assert
      await expect(openURL.mock.results[0].value).rejects.toThrow("aucune application");
    });

    it("should lock the scroll when the user is premium", () => {
      // Arrange & Act
      renderPremium(null);

      // Assert
      expect(screen.UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(false);
    });
  });

  it("should allow scrolling through the offers when the user is not premium", () => {
    // Arrange & Act
    render(<SubscriptionScreen />);

    // Assert
    expect(screen.UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(true);
  });

  it("should go back when the back button is pressed", () => {
    // Arrange
    render(<SubscriptionScreen />);

    // Act
    fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

    // Assert
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
