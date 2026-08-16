import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useSendInvitations } from "../useSendInvitations";
import type { Trip, User } from "../../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

const mockCreateInvitation = jest.fn();
jest.mock("../../contexts/TripsContext", () => ({
  useTrips: () => ({ createInvitation: mockCreateInvitation }),
}));

jest.mock("../../utils/i18n", () => ({
  parseApiError: jest.fn((error: unknown) => (error as Error)?.message ?? ""),
}));

const TRIP = { id: "trip-1", title: "Tokyo" } as Trip;
const FRIEND_WITH_EMAIL = { id: "f-1", name: "Ana", email: "ana@example.com" } as User;
const FRIEND_WITHOUT_EMAIL = { id: "f-2", name: "Bob", email: "" } as User;

function setup(trip: Trip | null = TRIP, friends: User[] = [FRIEND_WITH_EMAIL, FRIEND_WITHOUT_EMAIL]) {
  return renderHook(() => useSendInvitations({ trip, friends }));
}

describe("useSendInvitations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockCreateInvitation.mockResolvedValue({ id: "inv-1" });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("toggleFriend", () => {
    it("should add a friend to the selection when it is not selected yet", () => {
      // Arrange
      const { result } = setup();

      // Act
      act(() => result.current.toggleFriend("f-1"));

      // Assert
      expect(result.current.invitedFriends).toEqual(["f-1"]);
    });

    it("should remove a friend from the selection when it is already selected", () => {
      // Arrange
      const { result } = setup();
      act(() => result.current.toggleFriend("f-1"));

      // Act
      act(() => result.current.toggleFriend("f-1"));

      // Assert
      expect(result.current.invitedFriends).toEqual([]);
    });
  });

  describe("inviteCount", () => {
    it("should count only the selected friends when the email field is blank", () => {
      // Arrange
      const { result } = setup();

      // Act
      act(() => result.current.toggleFriend("f-1"));
      act(() => result.current.setEmailInput("   "));

      // Assert
      expect(result.current.inviteCount).toBe(1);
    });

    it("should count the typed email in addition to the selected friends", () => {
      // Arrange
      const { result } = setup();

      // Act
      act(() => result.current.toggleFriend("f-1"));
      act(() => result.current.setEmailInput("guest@example.com"));

      // Assert
      expect(result.current.inviteCount).toBe(2);
    });
  });

  describe("reset", () => {
    it("should clear the selected friends and the email field", () => {
      // Arrange
      const { result } = setup();
      act(() => result.current.toggleFriend("f-1"));
      act(() => result.current.setEmailInput("guest@example.com"));

      // Act
      act(() => result.current.reset());

      // Assert
      expect(result.current.invitedFriends).toEqual([]);
      expect(result.current.emailInput).toBe("");
    });
  });

  describe("handleSendInvitations", () => {
    it("should do nothing when there is no trip loaded", async () => {
      // Arrange
      const { result } = setup(null);
      const onComplete = jest.fn().mockResolvedValue(undefined);

      // Act
      await act(async () => {
        await result.current.handleSendInvitations(onComplete);
      });

      // Assert
      expect(mockCreateInvitation).not.toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();
    });

    it("should reject a malformed email without creating any invitation", async () => {
      // Arrange
      const { result } = setup();
      act(() => result.current.setEmailInput("pas-un-email"));

      // Act
      await act(async () => {
        await result.current.handleSendInvitations(jest.fn().mockResolvedValue(undefined));
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("inviteFriends.error", "inviteFriends.invalidEmail");
      expect(mockCreateInvitation).not.toHaveBeenCalled();
    });

    it("should create an editor invitation for the typed email", async () => {
      // Arrange
      const { result } = setup();
      act(() => result.current.setEmailInput("  guest@example.com  "));

      // Act
      await act(async () => {
        await result.current.handleSendInvitations(jest.fn().mockResolvedValue(undefined));
      });

      // Assert
      expect(mockCreateInvitation).toHaveBeenCalledWith({
        tripId: "trip-1",
        inviteeEmail: "guest@example.com",
        message: 'inviteFriends.invitationMessage "Tokyo"',
        permissions: { role: "editor", canEdit: true, canInvite: false, canDelete: false },
      });
    });

    it("should create an invitation for each selected friend having an email", async () => {
      // Arrange
      const { result } = setup();
      act(() => result.current.toggleFriend("f-1"));

      // Act
      await act(async () => {
        await result.current.handleSendInvitations(jest.fn().mockResolvedValue(undefined));
      });

      // Assert
      expect(mockCreateInvitation).toHaveBeenCalledTimes(1);
      expect(mockCreateInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ inviteeEmail: "ana@example.com" }),
      );
    });

    it("should ignore a selected id that matches no known friend", async () => {
      // Arrange
      const { result } = setup();
      act(() => result.current.toggleFriend("f-unknown"));

      // Act
      await act(async () => {
        await result.current.handleSendInvitations(jest.fn().mockResolvedValue(undefined));
      });

      // Assert
      expect(mockCreateInvitation).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        "inviteFriends.noInviteSelected",
        "inviteFriends.noInviteSelectedMsg",
      );
    });

    it("should warn about the friends skipped for lacking an email", async () => {
      // Arrange
      const { result } = setup();
      act(() => result.current.toggleFriend("f-1"));
      act(() => result.current.toggleFriend("f-2"));

      // Act
      await act(async () => {
        await result.current.handleSendInvitations(jest.fn().mockResolvedValue(undefined));
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "inviteFriends.noEmailFriends",
        'inviteFriends.noEmailFriendsMsg:{"names":"Bob"}',
      );
    });

    it("should warn and skip the completion callback when nothing is selected", async () => {
      // Arrange
      const { result } = setup();
      const onComplete = jest.fn().mockResolvedValue(undefined);

      // Act
      await act(async () => {
        await result.current.handleSendInvitations(onComplete);
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "inviteFriends.noInviteSelected",
        "inviteFriends.noInviteSelectedMsg",
      );
      expect(onComplete).not.toHaveBeenCalled();
    });

    it("should run the completion callback and report the number of invitations sent", async () => {
      // Arrange
      const { result } = setup();
      const onComplete = jest.fn().mockResolvedValue(undefined);
      act(() => result.current.toggleFriend("f-1"));
      act(() => result.current.setEmailInput("guest@example.com"));

      // Act
      await act(async () => {
        await result.current.handleSendInvitations(onComplete);
      });

      // Assert
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(Alert.alert).toHaveBeenLastCalledWith(
        "inviteFriends.invitationsSent",
        'inviteFriends.invitesSentCount:{"count":2}',
      );
    });

    it("should surface the parsed error when an invitation creation fails", async () => {
      // Arrange
      mockCreateInvitation.mockRejectedValue(new Error("quota exceeded"));
      const { result } = setup();
      act(() => result.current.toggleFriend("f-1"));

      // Act
      await act(async () => {
        await result.current.handleSendInvitations(jest.fn().mockResolvedValue(undefined));
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "quota exceeded");
    });

    it("should fall back to a generic message when the failure cannot be parsed", async () => {
      // Arrange
      mockCreateInvitation.mockRejectedValue(new Error(""));
      const { result } = setup();
      act(() => result.current.toggleFriend("f-1"));

      // Act
      await act(async () => {
        await result.current.handleSendInvitations(jest.fn().mockResolvedValue(undefined));
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "inviteFriends.invitationError");
    });

    it("should clear the sending flag once the invitations settle", async () => {
      // Arrange
      const { result } = setup();
      act(() => result.current.toggleFriend("f-1"));

      // Act
      await act(async () => {
        await result.current.handleSendInvitations(jest.fn().mockResolvedValue(undefined));
      });

      // Assert
      expect(result.current.sendingInvitations).toBe(false);
    });
  });
});
