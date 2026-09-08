// Branche volontairement non couverte : la valeur par défaut `size = 34` de
// `renderAvatar` (l. 76). Les deux seuls appels passent une taille explicite
// (34 pour les lignes de la liste, 42 pour l'en-tête de la feuille d'actions) :
// ce défaut est du code mort, signalé dans la PR et non corrigé ici.

import "./support/tripScreenMocks";

import React from "react";
import { ActivityIndicator, Image, RefreshControl } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import TripMembersScreen from "../TripMembersScreen";
import { useTripMembersData, MemberInfo } from "../../hooks/useTripMembersData";
import { useTripMembersActions } from "../../hooks/useTripMembersActions";
import { freezeClockAt, restoreClock } from "../../components/invitations/__tests__/frozenClock";

// On renvoie la clé de traduction plutôt que le libellé : les assertions restent
// lisibles et insensibles aux retouches de wording.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockUseAuth = jest.fn();
const mockUseNetwork = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: { tripId: "t1" } }),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("../../contexts/NetworkContext", () => ({ useNetwork: () => mockUseNetwork() }));
jest.mock("../../contexts/ThemeContext", () => {
  const actual = jest.requireActual("../../contexts/ThemeContext");
  return { ...actual, useTheme: () => ({ colors: actual.lightColors, isDark: false }) };
});

// Le chargement et les actions membres ont leurs propres suites : ici on pilote
// leurs états pour affirmer ce que l'écran en fait.
jest.mock("../../hooks/useTripMembersData", () => ({ useTripMembersData: jest.fn() }));
jest.mock("../../hooks/useTripMembersActions", () => ({ useTripMembersActions: jest.fn() }));

// La feuille glissante repose sur `Animated` : sa fermeture rappelle son
// callback à la fin de l'animation. On l'exécute immédiatement pour garder les
// tests synchrones — l'animation elle-même est couverte par `useBottomSheet`.
jest.mock("../../hooks/useBottomSheet", () => {
  const { Animated } = require("react-native");
  return {
    useBottomSheet: () => ({
      backdropAnim: new Animated.Value(1),
      translateY: new Animated.Value(0),
      open: mockOpenSheet,
      close: (onComplete?: () => void) => onComplete?.(),
    }),
  };
});

const mockOpenSheet = jest.fn();

const mockLoadData = jest.fn();
const mockOnRefresh = jest.fn();
const mockSetInviteLink = jest.fn();
const mockSetLinkExpiry = jest.fn();

const handleShareLink = jest.fn();
const handleRenewLink = jest.fn();
const handleCancelInvitation = jest.fn();
const handleRemoveMember = jest.fn();
const handleTransferOwnership = jest.fn();
const handleViewProfile = jest.fn();

// Le compte à rebours d'expiration du lien se calcule depuis « maintenant ».
const NOW = new Date("2026-03-01T12:00:00.000Z");

const OWNER_ID = "owner-1";

const makeMember = (overrides: Partial<MemberInfo> = {}): MemberInfo => ({
  userId: "m1",
  name: "Marya Dupont",
  email: "marya@example.com",
  role: "editor",
  status: "active",
  ...overrides,
});

const OWNER: MemberInfo = {
  userId: OWNER_ID,
  name: "Enzo Turpin",
  email: "enzo@example.com",
  role: "owner",
  status: "active",
};

interface SetupOptions {
  data?: Record<string, unknown>;
  actionLoading?: boolean;
  userId?: string | null;
  isConnected?: boolean;
}

const setup = ({
  data = {},
  actionLoading = false,
  userId = OWNER_ID,
  isConnected = true,
}: SetupOptions = {}) => {
  mockUseAuth.mockReturnValue({ user: userId ? { id: userId } : null });
  mockUseNetwork.mockReturnValue({ isConnected });
  (useTripMembersData as jest.Mock).mockReturnValue({
    tripTitle: "Pérou 2026",
    owner: OWNER,
    activeMembers: [],
    pendingMembers: [],
    inviteLink: "",
    setInviteLink: mockSetInviteLink,
    linkExpiry: null,
    setLinkExpiry: mockSetLinkExpiry,
    loading: false,
    refreshing: false,
    loadData: mockLoadData,
    onRefresh: mockOnRefresh,
    ...data,
  });
  (useTripMembersActions as jest.Mock).mockReturnValue({
    actionLoading,
    handleShareLink,
    handleRenewLink,
    handleCancelInvitation,
    handleRemoveMember,
    handleTransferOwnership,
    handleViewProfile,
  });
};

const openSheetFor = (name: string) => {
  fireEvent.press(screen.getByText(name));
};

describe("TripMembersScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    freezeClockAt(NOW);
    setup();
  });

  afterEach(() => {
    restoreClock();
  });

  describe("chargement", () => {
    it("should show the skeleton instead of the member list while loading", () => {
      // Arrange
      setup({ data: { loading: true } });

      // Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.queryByText("tripMembers.title")).toBeNull();
      expect(screen.queryByText("Enzo Turpin")).toBeNull();
    });

    it("should pass the trip identifier and the viewer to the data hook", () => {
      // Arrange & Act
      render(<TripMembersScreen />);

      // Assert
      expect(useTripMembersData).toHaveBeenCalledWith("t1", OWNER_ID);
    });

    it("should ask the data hook for an anonymous load when nobody is signed in", () => {
      // Arrange
      setup({ userId: null });

      // Act
      render(<TripMembersScreen />);

      // Assert
      expect(useTripMembersData).toHaveBeenCalledWith("t1", undefined);
    });
  });

  describe("en-tête", () => {
    it("should show the trip title above the screen title", () => {
      // Arrange & Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.getByText("Pérou 2026")).toBeTruthy();
      expect(screen.getByText("tripMembers.title")).toBeTruthy();
    });

    it("should go back when the back button is pressed", () => {
      // Arrange
      render(<TripMembersScreen />);

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("should open the invitation screen from the header button", () => {
      // Arrange
      render(<TripMembersScreen />);

      // Act
      fireEvent.press(screen.getByText("tripMembers.invite"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("InviteFriends", { tripId: "t1" });
    });

    it("should open the invitation screen from the bottom call to action", () => {
      // Arrange
      render(<TripMembersScreen />);

      // Act
      fireEvent.press(screen.getByText("tripMembers.inviteFromFriends"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("InviteFriends", { tripId: "t1" });
    });

    it("should refresh the list when the pull-to-refresh gesture is triggered", () => {
      // Arrange
      render(<TripMembersScreen />);

      // Act
      fireEvent(screen.UNSAFE_getByType(RefreshControl), "refresh");

      // Assert
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  describe("lien d'invitation", () => {
    it("should hide the link card when no link has been generated", () => {
      // Arrange & Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.queryByText("tripMembers.linkTitle")).toBeNull();
    });

    it("should show the link and share it when the button is pressed", () => {
      // Arrange
      setup({ data: { inviteLink: "https://mtc/invite/abc" } });
      render(<TripMembersScreen />);

      // Act
      fireEvent.press(screen.getByText("tripMembers.linkShare"));

      // Assert
      expect(screen.getByText("https://mtc/invite/abc")).toBeTruthy();
      expect(handleShareLink).toHaveBeenCalledWith("https://mtc/invite/abc");
    });

    it("should omit the expiry row when the link has no deadline", () => {
      // Arrange
      setup({ data: { inviteLink: "https://mtc/invite/abc" } });

      // Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.queryByText("tripMembers.linkExpiry")).toBeNull();
    });

    it("should show the remaining days before the link expires", () => {
      // Arrange
      setup({
        data: {
          inviteLink: "https://mtc/invite/abc",
          linkExpiry: new Date("2026-03-08T12:00:00.000Z"),
        },
      });

      // Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.getByText("tripMembers.linkExpiry")).toBeTruthy();
    });

    it("should renew the link through the actions hook", () => {
      // Arrange
      setup({
        data: {
          inviteLink: "https://mtc/invite/abc",
          linkExpiry: new Date("2026-03-08T12:00:00.000Z"),
        },
      });
      render(<TripMembersScreen />);

      // Act
      fireEvent.press(screen.getByText("tripMembers.linkRenew"));

      // Assert
      expect(handleRenewLink).toHaveBeenCalledWith({
        setInviteLink: mockSetInviteLink,
        setLinkExpiry: mockSetLinkExpiry,
      });
    });

    it("should clamp the expiry countdown to zero for an already expired link", () => {
      // Arrange
      setup({
        data: {
          inviteLink: "https://mtc/invite/abc",
          linkExpiry: new Date("2026-01-01T12:00:00.000Z"),
        },
      });

      // Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.getByText("tripMembers.linkExpiry")).toBeTruthy();
    });
  });

  describe("organisateur", () => {
    it("should mark the organiser row as the viewer when they own the trip", () => {
      // Arrange & Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.getByText("tripMembers.roleOrganizerSelf")).toBeTruthy();
      expect(screen.getByText("tripMembers.meLabel")).toBeTruthy();
    });

    it("should label the organiser neutrally for another viewer", () => {
      // Arrange
      setup({ userId: "someone-else" });

      // Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.getByText("tripMembers.roleOrganizer")).toBeTruthy();
      expect(screen.queryByText("tripMembers.meLabel")).toBeNull();
    });

    it("should hide the organiser section when the owner is unknown", () => {
      // Arrange
      setup({ data: { owner: null } });

      // Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.queryByText("tripMembers.sectionOrganizer")).toBeNull();
    });

    it("should show the initials of a member who has no avatar", () => {
      // Arrange & Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.getByText("ET")).toBeTruthy();
    });

    it("should show the picture of a member who has one", () => {
      // Arrange
      setup({ data: { owner: { ...OWNER, avatar: "https://cdn/enzo.png" } } });

      // Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.UNSAFE_getByType(Image).props.source).toEqual({ uri: "https://cdn/enzo.png" });
    });
  });

  describe("membres actifs", () => {
    it("should hide the members section when nobody else joined", () => {
      // Arrange & Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.queryByText("tripMembers.sectionMembers")).toBeNull();
    });

    it("should list the active members with their participant role", () => {
      // Arrange
      setup({ data: { activeMembers: [makeMember()] } });

      // Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.getByText("Marya Dupont")).toBeTruthy();
      expect(screen.getByText("tripMembers.roleParticipant")).toBeTruthy();
      expect(screen.getByText("tripMembers.sectionMembers")).toBeTruthy();
    });

    it("should open the action sheet when the owner taps another member", () => {
      // Arrange
      setup({ data: { activeMembers: [makeMember()] } });
      render(<TripMembersScreen />);

      // Act
      openSheetFor("Marya Dupont");

      // Assert
      expect(mockOpenSheet).toHaveBeenCalledTimes(1);
      expect(screen.getByText("tripMembers.viewProfile")).toBeTruthy();
    });

    it("should leave the member row inert for a viewer who is not the owner", () => {
      // Arrange
      setup({ data: { activeMembers: [makeMember()] }, userId: "someone-else" });
      render(<TripMembersScreen />);

      // Act
      openSheetFor("Marya Dupont");

      // Assert
      expect(mockOpenSheet).not.toHaveBeenCalled();
      expect(screen.queryByText("tripMembers.viewProfile")).toBeNull();
    });

    it("should leave the owner's own member row inert", () => {
      // Arrange
      setup({ data: { activeMembers: [makeMember({ userId: OWNER_ID, name: "Enzo Bis" })] } });
      render(<TripMembersScreen />);

      // Act
      openSheetFor("Enzo Bis");

      // Assert
      expect(mockOpenSheet).not.toHaveBeenCalled();
    });
  });

  describe("invitations en attente", () => {
    const PENDING = makeMember({
      userId: "inv-1",
      name: "Ferréol Martin",
      status: "pending",
      invitedAt: new Date("2026-02-25T12:00:00.000Z"),
    });

    it("should hide the pending section when there is no invitation", () => {
      // Arrange & Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.queryByText("tripMembers.sectionPending")).toBeNull();
    });

    it("should show how long ago an invitation was sent", () => {
      // Arrange
      setup({ data: { pendingMembers: [PENDING] } });

      // Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.getByText("tripMembers.pendingLabel tripMembers.pendingDaysAgo")).toBeTruthy();
    });

    it("should show a bare pending label when the invitation date is unknown", () => {
      // Arrange
      setup({ data: { pendingMembers: [makeMember({ userId: "inv-2", name: "Daryl Sow" })] } });

      // Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.getByText("tripMembers.pendingLabel")).toBeTruthy();
    });

    it("should let the owner cancel a pending invitation", () => {
      // Arrange
      setup({ data: { pendingMembers: [PENDING] } });
      render(<TripMembersScreen />);

      // Act
      fireEvent.press(screen.getByText("tripMembers.cancelInviteTitle"));

      // Assert
      expect(handleCancelInvitation).toHaveBeenCalledWith(PENDING);
    });

    it("should hide the cancel action from a viewer who is not the owner", () => {
      // Arrange
      setup({ data: { pendingMembers: [PENDING] }, userId: "someone-else" });

      // Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.queryByText("tripMembers.cancelInviteTitle")).toBeNull();
    });
  });

  describe("feuille d'actions", () => {
    const MEMBER = makeMember();

    const openSheet = (options: SetupOptions = {}) => {
      setup({ data: { activeMembers: [MEMBER] }, ...options });
      render(<TripMembersScreen />);
      openSheetFor("Marya Dupont");
    };

    it("should show the member identity in the sheet", () => {
      // Arrange & Act
      openSheet();

      // Assert
      expect(screen.getByText("marya@example.com")).toBeTruthy();
    });

    it("should omit the email line when the member has none", () => {
      // Arrange
      setup({ data: { activeMembers: [makeMember({ email: undefined })] } });
      render(<TripMembersScreen />);

      // Act
      openSheetFor("Marya Dupont");

      // Assert
      expect(screen.queryByText("marya@example.com")).toBeNull();
    });

    it("should open the member profile and close the sheet", () => {
      // Arrange
      openSheet();

      // Act
      fireEvent.press(screen.getByText("tripMembers.viewProfile"));

      // Assert
      expect(handleViewProfile).toHaveBeenCalledWith(MEMBER, expect.any(Function));
    });

    it("should offer the ownership transfer to the owner", () => {
      // Arrange
      openSheet();

      // Act
      fireEvent.press(screen.getByText("tripMembers.appointOrganizer"));

      // Assert
      expect(handleTransferOwnership).toHaveBeenCalledWith(MEMBER, expect.any(Function));
    });

    it("should offer the removal to the owner", () => {
      // Arrange
      openSheet();

      // Act
      fireEvent.press(screen.getByText("tripMembers.removeFromTrip"));

      // Assert
      expect(handleRemoveMember).toHaveBeenCalledWith(MEMBER, expect.any(Function));
    });

    it("should dismiss the sheet through the closing callback handed to the actions", () => {
      // Arrange
      openSheet();
      fireEvent.press(screen.getByText("tripMembers.viewProfile"));
      const closeSheet = handleViewProfile.mock.calls[0][1] as () => void;

      // Act
      act(() => closeSheet());

      // Assert
      expect(screen.queryByText("tripMembers.viewProfile")).toBeNull();
    });
  });

  describe("action en cours", () => {
    it("should not overlay a spinner while no action is running", () => {
      // Arrange & Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.queryByTestId("activity-indicator")).toBeNull();
    });

    it("should overlay a spinner while an action is running", () => {
      // Arrange
      setup({ actionLoading: true });

      // Act
      render(<TripMembersScreen />);

      // Assert
      expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });
  });

  describe("mode hors ligne", () => {
    it("should disable the header invitation button when offline", () => {
      // Arrange
      setup({ isConnected: false });
      render(<TripMembersScreen />);

      // Act
      fireEvent.press(screen.getByText("tripMembers.invite"));

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should disable the link sharing when offline", () => {
      // Arrange
      setup({ data: { inviteLink: "https://mtc/invite/abc" }, isConnected: false });
      render(<TripMembersScreen />);

      // Act
      fireEvent.press(screen.getByText("tripMembers.linkShare"));

      // Assert
      expect(handleShareLink).not.toHaveBeenCalled();
    });

    it("should disable the pending invitation cancellation when offline", () => {
      // Arrange
      setup({
        data: { pendingMembers: [makeMember({ userId: "inv-1", name: "Ferréol Martin" })] },
        isConnected: false,
      });
      render(<TripMembersScreen />);

      // Act
      fireEvent.press(screen.getByText("tripMembers.cancelInviteTitle"));

      // Assert
      expect(handleCancelInvitation).not.toHaveBeenCalled();
    });
  });
});
