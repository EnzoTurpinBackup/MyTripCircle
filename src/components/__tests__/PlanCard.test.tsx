import "./support/nativeMocks";

import React from "react";
import { View } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import PlanCard from "../PlanCard";
import { lightColors } from "../../contexts/ThemeContext";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

/** La carte n'expose pas de testID : c'est la vue racine du composant. */
const cardView = () => screen.UNSAFE_getAllByType(View)[0];

const baseProps = {
  id: "premium_monthly",
  title: "Premium",
  advantages: ["Voyages illimités", "Export du calendrier"],
  onSubscribe: jest.fn(),
};

describe("PlanCard", () => {
  it("should render the plan title", () => {
    render(<PlanCard {...baseProps} onSubscribe={jest.fn()} />);

    expect(screen.getByText("Premium")).toBeTruthy();
  });

  it("should render every advantage of the plan", () => {
    render(<PlanCard {...baseProps} onSubscribe={jest.fn()} />);

    expect(screen.getByText("Voyages illimités")).toBeTruthy();
    expect(screen.getByText("Export du calendrier")).toBeTruthy();
  });

  it("should render the price and its unit when a price is given", () => {
    render(<PlanCard {...baseProps} price="4,99 €" onSubscribe={jest.fn()} />);

    expect(screen.getByText("4,99 €")).toBeTruthy();
    expect(screen.getByText("subscription.perMonth")).toBeTruthy();
  });

  it("should not render the price unit when no price is given", () => {
    render(<PlanCard {...baseProps} onSubscribe={jest.fn()} />);

    expect(screen.queryByText("subscription.perMonth")).toBeNull();
  });

  it("should render the recommended badge when the plan is recommended", () => {
    render(<PlanCard {...baseProps} recommended onSubscribe={jest.fn()} />);

    expect(screen.getByText("subscription.recommended")).toBeTruthy();
  });

  it("should not render the recommended badge by default", () => {
    render(<PlanCard {...baseProps} onSubscribe={jest.fn()} />);

    expect(screen.queryByText("subscription.recommended")).toBeNull();
  });

  it("should highlight the card background when the plan is recommended", () => {
    render(<PlanCard {...baseProps} recommended onSubscribe={jest.fn()} />);

    expect(flatten(cardView().props.style).backgroundColor).toBe(lightColors.terraLight);
  });

  it("should use the neutral card background when the plan is not recommended", () => {
    render(<PlanCard {...baseProps} onSubscribe={jest.fn()} />);

    expect(flatten(cardView().props.style).backgroundColor).toBe(lightColors.surface);
  });

  it("should call onSubscribe with the plan id when the button is pressed", () => {
    const onSubscribe = jest.fn();
    render(<PlanCard {...baseProps} onSubscribe={onSubscribe} />);

    fireEvent.press(screen.getByLabelText("subscription.subscribe"));

    expect(onSubscribe).toHaveBeenCalledWith("premium_monthly");
  });

  it("should show the loading label on the button when loading", () => {
    render(<PlanCard {...baseProps} loading onSubscribe={jest.fn()} />);

    expect(screen.getByLabelText("common.loading")).toBeTruthy();
    expect(screen.queryByLabelText("subscription.subscribe")).toBeNull();
  });

  it("should not call onSubscribe while loading", () => {
    const onSubscribe = jest.fn();
    render(<PlanCard {...baseProps} loading onSubscribe={onSubscribe} />);

    fireEvent.press(screen.getByLabelText("common.loading"));

    expect(onSubscribe).not.toHaveBeenCalled();
  });
});
