import React from "react";
import { Animated } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import MemberActionSheet from "../MemberActionSheet";
import i18n from "../../../utils/i18n";
import type { CollabInfo } from "../../../hooks/useTripMembers";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const MEMBER: CollabInfo = { userId: "u1", name: "Sofia Marchand", isOwner: false };

function renderSheet(props: Partial<React.ComponentProps<typeof MemberActionSheet>> = {}) {
  const handlers = {
    onClose: jest.fn(),
    onViewProfile: jest.fn(),
    onTransfer: jest.fn(),
    onRemove: jest.fn(),
  };
  const anim = new Animated.Value(1);
  const utils = render(
    <MemberActionSheet
      member={MEMBER}
      isOwner={false}
      backdropAnim={anim}
      sheetY={anim.interpolate({ inputRange: [0, 1], outputRange: [340, 0] })}
      {...handlers}
      {...props}
    />
  );
  return { ...utils, ...handlers };
}

describe("MemberActionSheet", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should render the member identity", () => {
    // Arrange / Act
    renderSheet();

    // Assert
    expect(screen.getByText("Sofia Marchand")).toBeTruthy();
    expect(screen.getByText("Participant · Accepted")).toBeTruthy();
  });

  it("should call onViewProfile when the view profile row is pressed", () => {
    // Arrange
    const { onViewProfile } = renderSheet();

    // Act
    fireEvent.press(screen.getByText("View profile"));

    // Assert
    expect(onViewProfile).toHaveBeenCalledTimes(1);
  });

  it("should hide the owner-only actions from a regular member", () => {
    // Arrange / Act
    renderSheet({ isOwner: false });

    // Assert
    expect(screen.queryByText("Appoint organizer")).toBeNull();
    expect(screen.queryByText("Remove from trip")).toBeNull();
  });

  it("should show the owner-only actions to the trip owner", () => {
    // Arrange / Act
    renderSheet({ isOwner: true });

    // Assert
    expect(screen.getByText("Appoint organizer")).toBeTruthy();
    expect(screen.getByText("Transfer trip management to them")).toBeTruthy();
    expect(screen.getByText("Remove from trip")).toBeTruthy();
    expect(screen.getByText("They will lose access to bookings and addresses")).toBeTruthy();
  });

  it("should call onTransfer when the appoint organizer row is pressed", () => {
    // Arrange
    const { onTransfer } = renderSheet({ isOwner: true });

    // Act
    fireEvent.press(screen.getByText("Appoint organizer"));

    // Assert
    expect(onTransfer).toHaveBeenCalledTimes(1);
  });

  it("should call onRemove when the remove row is pressed", () => {
    // Arrange
    const { onRemove } = renderSheet({ isOwner: true });

    // Act
    fireEvent.press(screen.getByText("Remove from trip"));

    // Assert
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
