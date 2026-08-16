import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useInviteFriends } from "../useInviteFriends";
import ApiService from "../../services/ApiService";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

const mockGoBack = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
}));

let mockUser: { id: string; name?: string; email?: string; avatar?: string } | null = null;
jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

let mockFriends: any[] = [];
jest.mock("../../contexts/FriendsContext", () => ({
  useFriends: () => ({ friends: mockFriends }),
}));

jest.mock("../../services/ApiService", () => ({
  __esModule: true,
  default: { getTripById: jest.fn() },
}));

// Les sous-hooks sont la frontière de cette unité : useInviteFriends ne fait que
// charger le voyage et câbler leurs états entre eux.
const mockInviteSheetOpen = jest.fn();
const mockInviteSheetClose = jest.fn((cb?: () => void) => cb?.());
jest.mock("../useBottomSheet", () => ({
  useBottomSheet: () => ({
    sheetAnim: "invite-sheet-anim",
    backdropAnim: "invite-backdrop-anim",
    translateY: "invite-translate-y",
    open: mockInviteSheetOpen,
    close: mockInviteSheetClose,
  }),
}));

const mockMembers = {
  selectedMember: { userId: "member-1", name: "Bob", isOwner: false },
  actionLoading: false,
  memberSheet: { backdropAnim: "member-backdrop", translateY: "member-translate-y" },
  openSheet: jest.fn(),
  closeSheet: jest.fn(),
  handleRemoveMember: jest.fn(),
  handleTransferOwnership: jest.fn(),
  handleViewProfile: jest.fn(),
};
jest.mock("../useTripMembers", () => ({
  useTripMembers: () => mockMembers,
}));

const mockLoadPendingInvitations = jest.fn();
const mockPendingHandleCancel = jest.fn();
const mockPending = {
  pendingInvitations: [] as any[],
  actionLoading: false,
  loadPendingInvitations: mockLoadPendingInvitations,
  handleCancelInvitation: mockPendingHandleCancel,
};
jest.mock("../usePendingInvitations", () => ({
  usePendingInvitations: () => mockPending,
}));

const mockLoadLink = jest.fn();
const mockLink = {
  invitationLink: "https://x/tok-1",
  linkExpiry: new Date("2026-01-08T00:00:00.000Z"),
  loadLink: mockLoadLink,
  handleShareLink: jest.fn(),
  handleRenewLink: jest.fn(),
};
jest.mock("../useInvitationLink", () => ({
  useInvitationLink: () => mockLink,
}));

const mockSendInvitationsReset = jest.fn();
const mockHandleSendInvitations = jest.fn();
const mockSend = {
  invitedFriends: ["f-1"],
  emailInput: "guest@example.com",
  setEmailInput: jest.fn(),
  sendingInvitations: false,
  inviteCount: 2,
  toggleFriend: jest.fn(),
  reset: mockSendInvitationsReset,
  handleSendInvitations: mockHandleSendInvitations,
};
jest.mock("../useSendInvitations", () => ({
  useSendInvitations: () => mockSend,
}));

const mockGetTripById = (ApiService as unknown as { getTripById: jest.Mock }).getTripById;

const OWNER = { id: "owner-1", name: "Ana", email: "ana@example.com", avatar: "ana.png" };

const TRIP = {
  _id: "trip-1",
  title: "Tokyo",
  ownerId: "owner-1",
  collaborators: [{ userId: "member-1" }],
};

/** Monte le hook et laisse les chargements initiaux se résoudre. */
async function setup() {
  const hook = renderHook(() => useInviteFriends("trip-1"));
  await act(async () => {});
  return hook;
}

describe("useInviteFriends", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockUser = OWNER;
    mockFriends = [];
    mockPending.pendingInvitations = [];
    mockPending.actionLoading = false;
    mockMembers.actionLoading = false;
    mockGetTripById.mockResolvedValue(TRIP);
    mockLoadPendingInvitations.mockResolvedValue(undefined);
    mockLoadLink.mockResolvedValue(undefined);
    mockInviteSheetClose.mockImplementation((cb?: () => void) => cb?.());
    mockHandleSendInvitations.mockImplementation(async (onComplete: () => Promise<void>) => {
      await onComplete();
    });
    mockPendingHandleCancel.mockImplementation(async (_inv: unknown, onRefresh: () => Promise<void>) => {
      await onRefresh();
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("initial load", () => {
    it("should load the trip, the pending invitations and the invitation link on mount", async () => {
      // Arrange & Act
      const { result } = await setup();

      // Assert
      expect(mockGetTripById).toHaveBeenCalledWith("trip-1");
      expect(mockLoadPendingInvitations).toHaveBeenCalled();
      expect(mockLoadLink).toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
    });

    it("should normalize the trip identifier coming from mongo", async () => {
      // Arrange & Act
      const { result } = await setup();

      // Assert
      expect(result.current.trip).toMatchObject({ id: "trip-1", title: "Tokyo" });
    });

    it("should keep the plain identifier when the trip has no mongo id", async () => {
      // Arrange
      mockGetTripById.mockResolvedValue({ id: "trip-9", ownerId: "owner-1", collaborators: [] });

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.trip).toMatchObject({ id: "trip-9" });
    });

    it("should stop loading without a trip when the API returns nothing", async () => {
      // Arrange
      mockGetTripById.mockResolvedValue(null);

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.trip).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("should alert the user when the trip cannot be loaded", async () => {
      // Arrange
      mockGetTripById.mockRejectedValue(new Error("voyage introuvable"));

      // Act
      const { result } = await setup();

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "inviteFriends.loadingError");
      expect(result.current.loading).toBe(false);
    });
  });

  describe("access control", () => {
    it("should deny access to a collaborator who cannot invite", async () => {
      // Arrange
      mockUser = { id: "member-1" };
      mockGetTripById.mockResolvedValue({
        ...TRIP,
        collaborators: [{ userId: "member-1", permissions: { canInvite: false } }],
      });

      // Act
      const { result } = await setup();

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "inviteFriends.accessDenied",
        "inviteFriends.accessDeniedMsg",
        expect.any(Array),
      );
      expect(result.current.owner).toBeNull();
    });

    it("should deny access to a user who is not a collaborator at all", async () => {
      // Arrange
      mockUser = { id: "stranger-1" };

      // Act
      await setup();

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "inviteFriends.accessDenied",
        "inviteFriends.accessDeniedMsg",
        expect.any(Array),
      );
    });

    it("should navigate back when the access denied alert is acknowledged", async () => {
      // Arrange
      mockUser = { id: "stranger-1" };
      await setup();

      // Act
      const buttons = (Alert.alert as unknown as jest.Mock).mock.calls[0][2];
      act(() => buttons[0].onPress());

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("should let a collaborator allowed to invite through", async () => {
      // Arrange
      mockUser = { id: "member-1" };
      mockGetTripById.mockResolvedValue({
        ...TRIP,
        collaborators: [{ userId: "member-1", permissions: { canInvite: true } }],
      });

      // Act
      const { result } = await setup();

      // Assert
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(result.current.owner).not.toBeNull();
    });

    it("should skip the access check when no user is signed in", async () => {
      // Arrange
      mockUser = null;

      // Act
      const { result } = await setup();

      // Assert
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(result.current.owner).not.toBeNull();
    });
  });

  describe("owner and members", () => {
    it("should describe the owner with the signed-in user details when they own the trip", async () => {
      // Arrange & Act
      const { result } = await setup();

      // Assert
      expect(result.current.owner).toEqual({
        userId: "owner-1",
        name: "Ana",
        email: "ana@example.com",
        avatar: "ana.png",
        isOwner: true,
      });
      expect(result.current.isOwner).toBe(true);
    });

    it("should fall back to a generic owner label when the signed-in owner has no name", async () => {
      // Arrange
      mockUser = { id: "owner-1" };

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.owner).toMatchObject({
        name: "inviteFriends.ownerFallback",
        avatar: null,
      });
    });

    it("should describe a third-party owner from the friends list", async () => {
      // Arrange
      mockUser = null;
      mockFriends = [
        { friendId: "owner-1", name: "Ana", email: "ana@example.com", avatar: "ana.png", createdAt: new Date(0) },
      ];

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.owner).toEqual({
        userId: "owner-1",
        name: "Ana",
        email: undefined,
        avatar: "ana.png",
        isOwner: true,
      });
    });

    it("should fall back to a generic owner label when the owner is not a known friend", async () => {
      // Arrange
      mockUser = null;
      mockFriends = [];

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.owner).toMatchObject({
        name: "inviteFriends.ownerFallback",
        avatar: null,
      });
    });

    it("should name the collaborators from the friends list", async () => {
      // Arrange
      mockFriends = [
        { friendId: "member-1", name: "Bob", email: "bob@example.com", avatar: "bob.png", createdAt: new Date(0) },
      ];

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.activeMembers).toEqual([
        { userId: "member-1", name: "Bob", avatar: "bob.png", isOwner: false },
      ]);
    });

    it("should fall back to a generic member label for unknown collaborators", async () => {
      // Arrange
      mockFriends = [];

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.activeMembers).toEqual([
        { userId: "member-1", name: "inviteFriends.memberFallback", avatar: null, isOwner: false },
      ]);
    });

    it("should expose an empty member list when the trip has no collaborators", async () => {
      // Arrange
      mockGetTripById.mockResolvedValue({ _id: "trip-1", ownerId: "owner-1" });

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.activeMembers).toEqual([]);
    });

    it("should report a non-owner viewer as such", async () => {
      // Arrange
      mockUser = { id: "member-1" };
      mockGetTripById.mockResolvedValue({
        ...TRIP,
        collaborators: [{ userId: "member-1", permissions: { canInvite: true } }],
      });

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.isOwner).toBe(false);
    });
  });

  describe("friends split", () => {
    it("should map the friends of the context into invitable users", async () => {
      // Arrange
      mockFriends = [
        { friendId: "f-1", name: "Chloé", email: "chloe@example.com", avatar: "c.png", createdAt: new Date(0) },
      ];

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.friends).toEqual([
        {
          id: "f-1",
          name: "Chloé",
          email: "chloe@example.com",
          avatar: "c.png",
          createdAt: new Date(0),
        },
      ]);
    });

    it("should default the email to an empty string when a friend has none", async () => {
      // Arrange
      mockFriends = [{ friendId: "f-1", name: "Chloé", createdAt: new Date(0) }];

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.friends[0].email).toBe("");
    });

    it("should exclude the owner and the members from the invitable friends", async () => {
      // Arrange
      mockFriends = [
        { friendId: "owner-1", name: "Ana", createdAt: new Date(0) },
        { friendId: "member-1", name: "Bob", createdAt: new Date(0) },
        { friendId: "f-1", name: "Chloé", createdAt: new Date(0) },
      ];

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.friendsToInvite.map((f) => f.id)).toEqual(["f-1"]);
      expect(result.current.alreadyMembers.map((f) => f.id)).toEqual(["owner-1", "member-1"]);
    });

    it("should exclude the friends already having a pending invitation", async () => {
      // Arrange
      mockFriends = [
        { friendId: "f-1", name: "Chloé", email: "chloe@example.com", createdAt: new Date(0) },
        { friendId: "f-2", name: "David", email: "david@example.com", createdAt: new Date(0) },
      ];
      mockPending.pendingInvitations = [
        { inviteeEmail: "chloe@example.com" },
        { inviteePhone: "+33600000000" },
      ];

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.friendsToInvite.map((f) => f.id)).toEqual(["f-2"]);
    });
  });

  describe("action loading", () => {
    it("should be busy while a member action is running", async () => {
      // Arrange
      mockMembers.actionLoading = true;

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.actionLoading).toBe(true);
    });

    it("should be busy while an invitation action is running", async () => {
      // Arrange
      mockPending.actionLoading = true;

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.actionLoading).toBe(true);
    });

    it("should be idle when no sub-hook is working", async () => {
      // Arrange & Act
      const { result } = await setup();

      // Assert
      expect(result.current.actionLoading).toBe(false);
    });
  });

  describe("invite panel", () => {
    it("should show the panel and open the sheet", async () => {
      // Arrange
      const { result } = await setup();

      // Act
      act(() => result.current.openInvitePanel());

      // Assert
      expect(result.current.showInvitePanel).toBe(true);
      expect(mockInviteSheetOpen).toHaveBeenCalledTimes(1);
    });

    it("should hide the panel and clear the selection once the sheet is closed", async () => {
      // Arrange
      const { result } = await setup();
      act(() => result.current.openInvitePanel());

      // Act
      act(() => result.current.closeInvitePanel());

      // Assert
      expect(result.current.showInvitePanel).toBe(false);
      expect(mockSendInvitationsReset).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleCancelInvitation", () => {
    it("should delegate the cancellation and reload the trip and the pending invitations", async () => {
      // Arrange
      const { result } = await setup();
      mockGetTripById.mockClear();
      mockLoadPendingInvitations.mockClear();

      // Act
      await act(async () => {
        await result.current.handleCancelInvitation({ id: "inv-1" });
      });

      // Assert
      expect(mockPendingHandleCancel).toHaveBeenCalledWith({ id: "inv-1" }, expect.any(Function));
      expect(mockGetTripById).toHaveBeenCalledTimes(1);
      expect(mockLoadPendingInvitations).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleSendInvitations", () => {
    it("should close the panel and reload the trip once the invitations are sent", async () => {
      // Arrange
      const { result } = await setup();
      act(() => result.current.openInvitePanel());
      mockGetTripById.mockClear();

      // Act
      await act(async () => {
        await result.current.handleSendInvitations();
      });

      // Assert
      expect(mockHandleSendInvitations).toHaveBeenCalledWith(expect.any(Function));
      expect(result.current.showInvitePanel).toBe(false);
      expect(mockGetTripById).toHaveBeenCalledTimes(1);
    });
  });

  describe("exposed sub-hook state", () => {
    it("should forward the invitation link state", async () => {
      // Arrange & Act
      const { result } = await setup();

      // Assert
      expect(result.current.invitationLink).toBe("https://x/tok-1");
      expect(result.current.linkExpiry).toBe(mockLink.linkExpiry);
      expect(result.current.handleShareLink).toBe(mockLink.handleShareLink);
      expect(result.current.handleRenewLink).toBe(mockLink.handleRenewLink);
    });

    it("should forward the member sheet handles and animated values", async () => {
      // Arrange & Act
      const { result } = await setup();

      // Assert
      expect(result.current.selectedMember).toBe(mockMembers.selectedMember);
      expect(result.current.memberSheet).toBe(mockMembers.memberSheet);
      expect(result.current.backdropAnim).toBe("member-backdrop");
      expect(result.current.sheetY).toBe("member-translate-y");
      expect(result.current.openSheet).toBe(mockMembers.openSheet);
      expect(result.current.closeSheet).toBe(mockMembers.closeSheet);
      expect(result.current.handleRemoveMember).toBe(mockMembers.handleRemoveMember);
      expect(result.current.handleTransferOwnership).toBe(mockMembers.handleTransferOwnership);
      expect(result.current.handleViewProfile).toBe(mockMembers.handleViewProfile);
    });

    it("should forward the invite sheet animated values", async () => {
      // Arrange & Act
      const { result } = await setup();

      // Assert
      expect(result.current.inviteAnim).toBe("invite-sheet-anim");
      expect(result.current.inviteBackdrop).toBe("invite-backdrop-anim");
      expect(result.current.inviteY).toBe("invite-translate-y");
    });

    it("should forward the send invitations state", async () => {
      // Arrange & Act
      const { result } = await setup();

      // Assert
      expect(result.current.invitedFriends).toBe(mockSend.invitedFriends);
      expect(result.current.emailInput).toBe("guest@example.com");
      expect(result.current.setEmailInput).toBe(mockSend.setEmailInput);
      expect(result.current.sendingInvitations).toBe(false);
      expect(result.current.inviteCount).toBe(2);
      expect(result.current.toggleFriend).toBe(mockSend.toggleFriend);
    });

    it("should forward the pending invitations", async () => {
      // Arrange
      mockPending.pendingInvitations = [{ id: "inv-1", inviteeEmail: "bob@example.com" }];

      // Act
      const { result } = await setup();

      // Assert
      expect(result.current.pendingInvitations).toBe(mockPending.pendingInvitations);
    });
  });
});
