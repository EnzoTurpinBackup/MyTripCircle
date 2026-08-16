import "./support/screenMocks";

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import NotFoundScreen from "../NotFoundScreen";
import { useNavigation } from "@react-navigation/native";
import { statusBarInset } from "./support/layout";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
}));

const navigate = jest.fn();
const goBack = jest.fn();

describe("NotFoundScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigate, goBack });
  });

  it("should announce the 404 status", () => {
    // Arrange & Act
    render(<NotFoundScreen />);

    // Assert
    expect(screen.getByText("404")).toBeTruthy();
    expect(screen.getByText("notFound.title")).toBeTruthy();
    expect(screen.getByText("notFound.description")).toBeTruthy();
  });

  it("should show the map icon", () => {
    // Arrange & Act
    render(<NotFoundScreen />);

    // Assert
    expect(screen.getByText("icon:map-outline")).toBeTruthy();
  });

  it("should reserve the iOS status bar height", () => {
    // Arrange & Act
    render(<NotFoundScreen />);

    // Assert — contrepartie iOS de `StatusScreens.android.test.tsx`.
    expect(statusBarInset()).toBe(60);
  });

  it("should navigate to the main stack when the home button is pressed", () => {
    // Arrange
    render(<NotFoundScreen />);

    // Act
    fireEvent.press(screen.getByText("notFound.goHome"));

    // Assert
    expect(navigate).toHaveBeenCalledWith("Main");
  });

  it("should go back when the back button is pressed", () => {
    // Arrange
    render(<NotFoundScreen />);

    // Act
    fireEvent.press(screen.getByText("notFound.goBack"));

    // Assert
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
