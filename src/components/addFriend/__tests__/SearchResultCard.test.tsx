import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import SearchResultCard from "../SearchResultCard";
import i18n from "../../../utils/i18n";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

function makeResult(overrides: Record<string, any> = {}) {
  return {
    id: "u1",
    name: "Manon Girard",
    email: "manon@example.test",
    stats: { totalTrips: 12, countries: 5, commonFriends: 3 },
    ...overrides,
  };
}

function renderCard(props: Partial<React.ComponentProps<typeof SearchResultCard>> = {}) {
  const handlers = { onSend: jest.fn(), onViewProfile: jest.fn() };
  const utils = render(
    <SearchResultCard result={makeResult()} sending={false} {...handlers} {...props} />
  );
  return { ...utils, ...handlers };
}

describe("SearchResultCard", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should render the user identity under the result heading", () => {
    // Arrange / Act
    renderCard();

    // Assert
    expect(screen.getByText("RESULT")).toBeTruthy();
    expect(screen.getByText("Manon Girard")).toBeTruthy();
    expect(screen.getByText("manon@example.test")).toBeTruthy();
  });

  it("should render the three profile statistics", () => {
    // Arrange / Act
    renderCard();

    // Assert
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("Trips")).toBeTruthy();
    expect(screen.getByText("Countries")).toBeTruthy();
    expect(screen.getByText("Mutual")).toBeTruthy();
  });

  it("should call onViewProfile when the profile link is pressed", () => {
    // Arrange
    const { onViewProfile } = renderCard();

    // Act
    fireEvent.press(screen.getByText("View profile ›"));

    // Assert
    expect(onViewProfile).toHaveBeenCalledTimes(1);
  });

  it("should offer to send a friend request when there is no relation yet", () => {
    // Arrange / Act
    renderCard();

    // Assert
    expect(screen.getByText("Send friend request")).toBeTruthy();
  });

  it("should call onSend when the send request button is pressed", () => {
    // Arrange
    const { onSend } = renderCard();

    // Act
    fireEvent.press(screen.getByText("Send friend request"));

    // Assert
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("should show the already-friends pill when the user is already a friend", () => {
    // Arrange / Act
    renderCard({ result: makeResult({ relation: "friend" }) });

    // Assert
    expect(screen.getByText("Already friends")).toBeTruthy();
    expect(screen.queryByText("Send friend request")).toBeNull();
  });

  it("should show the request-sent state when a request is already pending", () => {
    // Arrange / Act
    renderCard({ result: makeResult({ relation: "pending_sent" }) });

    // Assert
    expect(screen.getByText("Request sent")).toBeTruthy();
    expect(screen.queryByText("Send friend request")).toBeNull();
  });

  it("should offer to accept when the other user already sent a request", () => {
    // Arrange / Act
    renderCard({ result: makeResult({ relation: "pending_received" }) });

    // Assert
    expect(screen.getByText("Accept request")).toBeTruthy();
  });

  it("should call onSend when accepting an incoming request", () => {
    // Arrange
    const { onSend } = renderCard({ result: makeResult({ relation: "pending_received" }) });

    // Act
    fireEvent.press(screen.getByText("Accept request"));

    // Assert
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("should not call onSend while a request is already in flight", () => {
    // Arrange
    const { onSend } = renderCard({ sending: true });

    // Act
    fireEvent.press(screen.getByText("Send friend request"));

    // Assert
    expect(onSend).not.toHaveBeenCalled();
  });

  it("should show the user initials when there is no avatar", () => {
    // Arrange / Act
    renderCard();

    // Assert
    expect(screen.getByText("MG")).toBeTruthy();
  });

  it("should show the avatar image instead of the initials when one is available", () => {
    // Arrange / Act
    renderCard({ result: makeResult({ avatar: "https://example.test/m.png" }) });

    // Assert
    expect(screen.queryByText("MG")).toBeNull();
  });
});
