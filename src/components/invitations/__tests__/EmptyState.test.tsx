import React from "react";
import { render, screen } from "@testing-library/react-native";
import EmptyState from "../EmptyState";
import i18n from "../../../utils/i18n";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

describe("EmptyState", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should render the all-invitations copy when the active tab is all", () => {
    // Arrange / Act
    render(<EmptyState tab="all" />);

    // Assert
    expect(screen.getByText("No invitations")).toBeTruthy();
    expect(screen.getByText("You haven't received any trip invitations yet.")).toBeTruthy();
  });

  it("should render the pending copy when the active tab is pending", () => {
    // Arrange / Act
    render(<EmptyState tab="pending" />);

    // Assert
    expect(screen.getByText("Nothing pending")).toBeTruthy();
    expect(screen.getByText("All your invitations have already been handled.")).toBeTruthy();
  });

  it("should render the sent copy when the active tab is sent", () => {
    // Arrange / Act
    render(<EmptyState tab="sent" />);

    // Assert
    expect(screen.getByText("No invitations sent")).toBeTruthy();
    expect(screen.getByText("Invitations you send to your friends will appear here.")).toBeTruthy();
  });
});
