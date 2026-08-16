import React from "react";
import { render, screen } from "@testing-library/react-native";
import NotifEmptyState from "../NotifEmptyState";
import i18n from "../../../utils/i18n";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

describe("NotifEmptyState", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should tell the user that everything has been read", () => {
    // Arrange / Act
    render(<NotifEmptyState />);

    // Assert
    expect(screen.getByText("All read!")).toBeTruthy();
    expect(screen.getByText("You have no notifications at the moment.")).toBeTruthy();
  });
});
