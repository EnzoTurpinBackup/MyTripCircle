import React from "react";
import { Image } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import MemberRow, { AvatarBubble } from "../MemberRow";
import i18n from "../../../utils/i18n";
import type { CollabInfo } from "../../../hooks/useTripMembers";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// `useAuth` lève une erreur hors AuthProvider : on mocke la frontière plutôt
// que de monter tout le contexte d'authentification pour une ligne de membre.
const mockUser = { current: { id: "me" } as { id: string } | null };
jest.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser.current }),
}));

function makeMember(overrides: Partial<CollabInfo> = {}): CollabInfo {
  return { userId: "other", name: "Camille Roy", isOwner: false, ...overrides };
}

function renderRow(props: Partial<React.ComponentProps<typeof MemberRow>> = {}) {
  const onPress = jest.fn();
  const utils = render(
    <MemberRow member={makeMember()} isOwner={false} onPress={onPress} {...props} />
  );
  return { ...utils, onPress };
}

describe("MemberRow", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  beforeEach(() => {
    mockUser.current = { id: "me" };
  });

  it("should render the member name", () => {
    // Arrange / Act
    renderRow();

    // Assert
    expect(screen.getByText("Camille Roy")).toBeTruthy();
  });

  it("should label a plain member as participant", () => {
    // Arrange / Act
    renderRow();

    // Assert
    expect(screen.getByText("✈️ Participant · Accepted")).toBeTruthy();
  });

  it("should label another user who owns the trip as organizer", () => {
    // Arrange / Act
    renderRow({ member: makeMember({ isOwner: true }) });

    // Assert
    expect(screen.getByText("👑 Organizer")).toBeTruthy();
  });

  it("should label the current user who owns the trip as organizer and self", () => {
    // Arrange / Act
    renderRow({ member: makeMember({ userId: "me", isOwner: true }) });

    // Assert
    expect(screen.getByText("👑 Organizer · You")).toBeTruthy();
  });

  it("should show the me tag on the row of the current user", () => {
    // Arrange / Act
    renderRow({ member: makeMember({ userId: "me" }) });

    // Assert
    expect(screen.getByText("Me")).toBeTruthy();
    expect(screen.queryByText("›")).toBeNull();
  });

  it("should show a chevron when the trip owner looks at another member", () => {
    // Arrange / Act
    renderRow({ isOwner: true });

    // Assert
    expect(screen.getByText("›")).toBeTruthy();
    expect(screen.queryByText("Me")).toBeNull();
  });

  it("should call onPress with the member when the trip owner taps another member", () => {
    // Arrange
    const { onPress } = renderRow({ isOwner: true });

    // Act
    fireEvent.press(screen.getByText("Camille Roy"));

    // Assert
    expect(onPress).toHaveBeenCalledWith(makeMember());
  });

  // NB : `fireEvent.press` de RNTL remonte jusqu'à la prop `onPress` du
  // composant lui-même, y compris quand il ne rend aucun Touchable. On vérifie
  // donc l'absence d'affordance (le chevron) plutôt que l'absence d'appel.
  it("should offer no tap affordance when the viewer is not the trip owner", () => {
    // Arrange / Act
    renderRow({ isOwner: false });

    // Assert
    expect(screen.queryByText("›")).toBeNull();
  });

  it("should offer no tap affordance on the row of another owner", () => {
    // Arrange / Act
    renderRow({ isOwner: true, member: makeMember({ isOwner: true }) });

    // Assert
    expect(screen.queryByText("›")).toBeNull();
    expect(screen.getByText("👑 Organizer")).toBeTruthy();
  });

  it("should show neither tag nor chevron when the viewer is not the owner and the row is not theirs", () => {
    // Arrange / Act
    renderRow();

    // Assert
    expect(screen.queryByText("Me")).toBeNull();
    expect(screen.queryByText("›")).toBeNull();
  });

  it("should not treat any row as the current user when nobody is authenticated", () => {
    // Arrange
    mockUser.current = null;

    // Act
    renderRow({ member: makeMember({ userId: "me" }) });

    // Assert
    expect(screen.queryByText("Me")).toBeNull();
  });
});

describe("AvatarBubble", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should render the initials when the member has no avatar", () => {
    // Arrange / Act
    render(<AvatarBubble name="Camille Roy" />);

    // Assert
    expect(screen.getByText("CR")).toBeTruthy();
  });

  it("should render the avatar image instead of the initials when one is provided", () => {
    // Arrange / Act
    render(<AvatarBubble name="Camille Roy" avatar="https://example.test/a.png" />);

    // Assert
    expect(screen.queryByText("CR")).toBeNull();
  });

  it("should hide the avatar from assistive technologies when one is provided", () => {
    // Arrange / Act
    render(<AvatarBubble name="Camille Roy" avatar="https://example.test/a.png" />);

    // Assert — le nom du membre est déjà lu à côté de la bulle.
    expect(screen.UNSAFE_getByType(Image).props).toMatchObject({
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: "no",
    });
  });

  it("should render the initials when the avatar is explicitly null", () => {
    // Arrange / Act
    render(<AvatarBubble name="Camille Roy" size={64} ownerBorder avatar={null} />);

    // Assert
    expect(screen.getByText("CR")).toBeTruthy();
  });
});
