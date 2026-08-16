import "../../__tests__/support/nativeMocks";

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import IdeaChips from "../IdeaChips";
import { lightColors } from "../../../contexts/ThemeContext";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const baseProps = {
  customDays: 5,
  difficulty: "easy" as const,
  colors: lightColors,
  onDecrement: jest.fn(),
  onIncrement: jest.fn(),
};

describe("IdeaChips", () => {
  it("should render the current number of days", () => {
    render(<IdeaChips {...baseProps} onDecrement={jest.fn()} onIncrement={jest.fn()} />);

    expect(screen.getByText("5 ideas.addModal.days")).toBeTruthy();
  });

  it("should call onDecrement when the minus stepper is pressed", () => {
    const onDecrement = jest.fn();
    render(<IdeaChips {...baseProps} onDecrement={onDecrement} onIncrement={jest.fn()} />);

    fireEvent.press(screen.UNSAFE_getByProps({ name: "remove" }));

    expect(onDecrement).toHaveBeenCalledTimes(1);
  });

  it("should call onIncrement when the plus stepper is pressed", () => {
    const onIncrement = jest.fn();
    render(<IdeaChips {...baseProps} onDecrement={jest.fn()} onIncrement={onIncrement} />);

    fireEvent.press(screen.UNSAFE_getByProps({ name: "add" }));

    expect(onIncrement).toHaveBeenCalledTimes(1);
  });

  it("should render the green marker and label for the easy difficulty", () => {
    render(<IdeaChips {...baseProps} onDecrement={jest.fn()} onIncrement={jest.fn()} />);

    expect(screen.getByText("🟢")).toBeTruthy();
    expect(screen.getByText("ideas.detail.difficulty.easy")).toBeTruthy();
  });

  it("should render the amber marker and label for the moderate difficulty", () => {
    render(
      <IdeaChips
        {...baseProps}
        difficulty="moderate"
        onDecrement={jest.fn()}
        onIncrement={jest.fn()}
      />,
    );

    expect(screen.getByText("🟡")).toBeTruthy();
    expect(screen.getByText("ideas.detail.difficulty.moderate")).toBeTruthy();
  });

  it("should render the red marker and label for the adventurous difficulty", () => {
    render(
      <IdeaChips
        {...baseProps}
        difficulty="adventurous"
        onDecrement={jest.fn()}
        onIncrement={jest.fn()}
      />,
    );

    expect(screen.getByText("🔴")).toBeTruthy();
    expect(screen.getByText("ideas.detail.difficulty.adventurous")).toBeTruthy();
  });
});
