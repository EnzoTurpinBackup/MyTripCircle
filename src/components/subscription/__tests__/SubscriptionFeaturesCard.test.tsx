import "../../__tests__/support/nativeMocks";

import React from "react";
import { render, screen } from "@testing-library/react-native";
import SubscriptionFeaturesCard from "../SubscriptionFeaturesCard";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("SubscriptionFeaturesCard", () => {
  it("should render the shared-features title for the default variant", () => {
    render(<SubscriptionFeaturesCard />);

    expect(screen.getByText("subscription.includedInAllPlans")).toBeTruthy();
  });

  it("should list the four shared features for the default variant", () => {
    render(<SubscriptionFeaturesCard />);

    expect(screen.getByText("subscription.featureCloud")).toBeTruthy();
    expect(screen.getByText("subscription.featureSecure")).toBeTruthy();
    expect(screen.getByText("subscription.featureTeam")).toBeTruthy();
    expect(screen.getByText("subscription.featureUpdates")).toBeTruthy();
  });

  it("should render the premium title for the premium variant", () => {
    render(<SubscriptionFeaturesCard variant="premium" />);

    expect(screen.getByText("subscription.premiumAdvantagesTitle")).toBeTruthy();
  });

  it("should list the six premium advantages for the premium variant", () => {
    render(<SubscriptionFeaturesCard variant="premium" />);

    expect(screen.getByText("subscription.monthlyAdvantage1")).toBeTruthy();
    expect(screen.getByText("subscription.monthlyAdvantage4")).toBeTruthy();
    expect(screen.getByText("subscription.annualAdvantage3")).toBeTruthy();
    expect(screen.getByText("subscription.annualAdvantage5")).toBeTruthy();
  });

  it("should number the premium advantages from one", () => {
    render(<SubscriptionFeaturesCard variant="premium" />);

    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
  });

  it("should not render the shared-features title for the premium variant", () => {
    render(<SubscriptionFeaturesCard variant="premium" />);

    expect(screen.queryByText("subscription.includedInAllPlans")).toBeNull();
  });
});
