import "./support/screenMocks";

import React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";

import WelcomeScreen from "../WelcomeScreen";
import { lightColors, useTheme } from "../../contexts/ThemeContext";
import { useNavigation } from "@react-navigation/native";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({ useNavigation: jest.fn() }));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: jest.fn(),
}));

const navigate = jest.fn();

describe("WelcomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigate });
    (useTheme as jest.Mock).mockReturnValue({ colors: lightColors });
  });

  it("should present the product name and its tagline", () => {
    // Arrange & Act
    render(<WelcomeScreen />);

    // Assert
    expect(screen.getByText("Circle")).toBeTruthy();
    expect(screen.getByText("welcome.subtitle")).toBeTruthy();
  });

  it("should open the registration form when the primary call to action is pressed", () => {
    // Arrange
    render(<WelcomeScreen />);

    // Act
    fireEvent.press(screen.getByText("welcome.ctaStart"));

    // Assert
    expect(navigate).toHaveBeenCalledWith("Auth", { initialMode: "register" });
  });

  it("should open the login form when the returning user call to action is pressed", () => {
    // Arrange
    render(<WelcomeScreen />);

    // Act
    fireEvent.press(screen.getByText("welcome.ctaHaveAccount"));

    // Assert
    expect(navigate).toHaveBeenCalledWith("Auth", { initialMode: "login" });
  });

  it("should tint the brand suffix with the accent colour of the active theme", () => {
    // Arrange
    const accent = "#123456";
    (useTheme as jest.Mock).mockReturnValue({ colors: { ...lightColors, terra: accent } });

    // Act
    render(<WelcomeScreen />);

    // Assert
    expect(screen.getByText("Circle")).toHaveStyle({ color: accent });
  });
});
