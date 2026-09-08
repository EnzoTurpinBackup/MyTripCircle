import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import FriendsTabBar from "../FriendsTabBar";
import i18n from "../../../utils/i18n";
import { colors, t } from "./friendsTestHarness";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

function renderTabBar(props: Partial<React.ComponentProps<typeof FriendsTabBar>> = {}) {
  const onTabChange = jest.fn();
  const utils = render(
    <FriendsTabBar
      activeTab="friends"
      friendsCount={4}
      totalPending={0}
      onTabChange={onTabChange}
      t={t}
      colors={colors}
      {...props}
    />
  );
  return { ...utils, onTabChange };
}

describe("FriendsTabBar", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should render the three tabs with the friends count", () => {
    // Arrange / Act
    renderTabBar();

    // Assert
    expect(screen.getByText("Friends (4)")).toBeTruthy();
    expect(screen.getByText("Requests")).toBeTruthy();
    expect(screen.getByText("Suggestions")).toBeTruthy();
  });

  it("should highlight the friends tab when it is active", () => {
    // Arrange / Act
    renderTabBar({ activeTab: "friends" });

    // Assert
    expect(screen.getByText("Friends (4)").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: colors.terra })])
    );
  });

  it("should dim the friends tab when another tab is active", () => {
    // Arrange / Act
    renderTabBar({ activeTab: "requests" });

    // Assert
    expect(screen.getByText("Friends (4)").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: colors.textLight })])
    );
  });

  it("should highlight the requests tab when it is active", () => {
    // Arrange / Act
    renderTabBar({ activeTab: "requests" });

    // Assert
    expect(screen.getByText("Requests").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: colors.terra })])
    );
  });

  it("should highlight the suggestions tab when it is active", () => {
    // Arrange / Act
    renderTabBar({ activeTab: "suggestions" });

    // Assert
    expect(screen.getByText("Suggestions").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: colors.terra })])
    );
  });

  it("should show the pending badge when requests are waiting", () => {
    // Arrange / Act
    renderTabBar({ totalPending: 7 });

    // Assert
    expect(screen.getByText("7")).toBeTruthy();
  });

  it("should hide the pending badge when nothing is waiting", () => {
    // Arrange / Act
    renderTabBar({ totalPending: 0 });

    // Assert
    expect(screen.queryByText("0")).toBeNull();
  });

  it("should call onTabChange with friends when the friends tab is pressed", () => {
    // Arrange
    const { onTabChange } = renderTabBar({ activeTab: "requests" });

    // Act
    fireEvent.press(screen.getByText("Friends (4)"));

    // Assert
    expect(onTabChange).toHaveBeenCalledWith("friends");
  });

  it("should call onTabChange with requests when the requests tab is pressed", () => {
    // Arrange
    const { onTabChange } = renderTabBar();

    // Act
    fireEvent.press(screen.getByText("Requests"));

    // Assert
    expect(onTabChange).toHaveBeenCalledWith("requests");
  });

  it("should call onTabChange with suggestions when the suggestions tab is pressed", () => {
    // Arrange
    const { onTabChange } = renderTabBar();

    // Act
    fireEvent.press(screen.getByText("Suggestions"));

    // Assert
    expect(onTabChange).toHaveBeenCalledWith("suggestions");
  });
});
