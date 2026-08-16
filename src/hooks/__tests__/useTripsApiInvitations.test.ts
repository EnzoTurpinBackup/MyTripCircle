import { renderHook, act } from "@testing-library/react-native";
import { useTripsApiInvitations } from "../useTripsApiInvitations";
import ApiService from "../../services/ApiService";
import type { TripInvitation } from "../../types";

jest.mock("../../services/ApiService", () => ({
  __esModule: true,
  default: {
    createInvitation: jest.fn(),
    getUserInvitations: jest.fn(),
    getSentInvitations: jest.fn(),
    respondToInvitation: jest.fn(),
    getInvitationByToken: jest.fn(),
    getTripInvitationLink: jest.fn(),
    cancelInvitation: jest.fn(),
  },
}));

const mockApi = ApiService as unknown as Record<string, jest.Mock>;

const RAW_INVITATION = {
  _id: "inv-1",
  tripId: "trip-1",
  inviterId: "user-1",
  inviteeEmail: "ami@example.com",
  status: "pending",
  token: "tok-1",
  expiresAt: "2026-02-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
};

/** Rejoue l'updater passé au setter React sur un état initial donné. */
function applyUpdater(setter: jest.Mock, previous: TripInvitation[]): TripInvitation[] {
  const updater = setter.mock.calls[0][0] as (prev: TripInvitation[]) => TripInvitation[];
  return updater(previous);
}

function setup() {
  const setInvitations = jest.fn();
  const refreshData = jest.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() =>
    useTripsApiInvitations({
      setInvitations: setInvitations as unknown as React.Dispatch<
        React.SetStateAction<TripInvitation[]>
      >,
      refreshData,
    }),
  );
  return { result, setInvitations, refreshData };
}

describe("useTripsApiInvitations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createInvitation", () => {
    it("should return the mapped invitation when the API call succeeds", async () => {
      // Arrange
      mockApi.createInvitation.mockResolvedValue(RAW_INVITATION);
      const { result } = setup();

      // Act
      let created: TripInvitation | undefined;
      await act(async () => {
        created = await result.current.createInvitation({ tripId: "trip-1" });
      });

      // Assert
      expect(created).toMatchObject({ id: "inv-1", token: "tok-1", status: "pending" });
    });

    it("should append the created invitation to the existing list when the API call succeeds", async () => {
      // Arrange
      mockApi.createInvitation.mockResolvedValue(RAW_INVITATION);
      const { result, setInvitations } = setup();

      // Act
      await act(async () => {
        await result.current.createInvitation({ tripId: "trip-1" });
      });

      // Assert
      expect(
        applyUpdater(setInvitations, [{ id: "inv-0" } as TripInvitation]).map((i) => i.id),
      ).toEqual(["inv-0", "inv-1"]);
    });

    it("should rethrow when the API call fails", async () => {
      // Arrange
      mockApi.createInvitation.mockRejectedValue(new Error("create failed"));
      const { result } = setup();

      // Act & Assert
      await expect(result.current.createInvitation({ tripId: "trip-1" })).rejects.toThrow(
        "create failed",
      );
    });
  });

  describe("getUserInvitations", () => {
    it("should keep the trip and inviter extras alongside the mapped invitation", async () => {
      // Arrange
      const trip = { _id: "trip-1", title: "Tokyo" };
      const inviter = { name: "Ana" };
      mockApi.getUserInvitations.mockResolvedValue([{ ...RAW_INVITATION, trip, inviter }]);
      const { result } = setup();

      // Act
      let invitations: any[] = [];
      await act(async () => {
        invitations = await result.current.getUserInvitations("ami@example.com", "pending");
      });

      // Assert
      expect(mockApi.getUserInvitations).toHaveBeenCalledWith("ami@example.com", "pending");
      expect(invitations[0]).toMatchObject({ id: "inv-1", trip, inviter });
    });

    it("should return an empty array when the API returns no invitation", async () => {
      // Arrange
      mockApi.getUserInvitations.mockResolvedValue([]);
      const { result } = setup();

      // Act
      let invitations: any[] = [{ placeholder: true }];
      await act(async () => {
        invitations = await result.current.getUserInvitations("ami@example.com");
      });

      // Assert
      expect(invitations).toEqual([]);
    });

    it("should rethrow when the API call fails", async () => {
      // Arrange
      mockApi.getUserInvitations.mockRejectedValue(new Error("list failed"));
      const { result } = setup();

      // Act & Assert
      await expect(result.current.getUserInvitations("ami@example.com")).rejects.toThrow(
        "list failed",
      );
    });
  });

  describe("getSentInvitations", () => {
    it("should return the mapped sent invitations when the API call succeeds", async () => {
      // Arrange
      mockApi.getSentInvitations.mockResolvedValue([RAW_INVITATION]);
      const { result } = setup();

      // Act
      let invitations: TripInvitation[] = [];
      await act(async () => {
        invitations = await result.current.getSentInvitations("user-1", "pending");
      });

      // Assert
      expect(mockApi.getSentInvitations).toHaveBeenCalledWith("user-1", "pending");
      expect(invitations).toHaveLength(1);
      expect(invitations[0]).toMatchObject({ id: "inv-1" });
    });

    it("should rethrow when the API call fails", async () => {
      // Arrange
      mockApi.getSentInvitations.mockRejectedValue(new Error("sent failed"));
      const { result } = setup();

      // Act & Assert
      await expect(result.current.getSentInvitations("user-1")).rejects.toThrow("sent failed");
    });
  });

  describe("respondToInvitation", () => {
    it("should update the status of the matching invitation when the response succeeds", async () => {
      // Arrange
      mockApi.respondToInvitation.mockResolvedValue({ success: true, status: "accepted" });
      const { result, setInvitations } = setup();
      const existing = [
        { token: "tok-0", status: "pending" } as TripInvitation,
        { token: "tok-1", status: "pending" } as TripInvitation,
      ];

      // Act
      await act(async () => {
        await result.current.respondToInvitation("tok-1", "accept", "user-1");
      });

      // Assert
      expect(applyUpdater(setInvitations, existing).map((i) => i.status)).toEqual([
        "pending",
        "accepted",
      ]);
    });

    it("should refresh the data when the invitation is accepted", async () => {
      // Arrange
      mockApi.respondToInvitation.mockResolvedValue({ success: true, status: "accepted" });
      const { result, refreshData } = setup();

      // Act
      await act(async () => {
        await result.current.respondToInvitation("tok-1", "accept", "user-1");
      });

      // Assert
      expect(refreshData).toHaveBeenCalledTimes(1);
    });

    it("should not refresh the data when the invitation is declined", async () => {
      // Arrange
      mockApi.respondToInvitation.mockResolvedValue({ success: true, status: "declined" });
      const { result, refreshData } = setup();

      // Act
      await act(async () => {
        await result.current.respondToInvitation("tok-1", "decline");
      });

      // Assert
      expect(refreshData).not.toHaveBeenCalled();
    });

    it("should return false and leave the list untouched when the API reports a failure", async () => {
      // Arrange
      mockApi.respondToInvitation.mockResolvedValue({ success: false });
      const { result, setInvitations, refreshData } = setup();

      // Act
      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.respondToInvitation("tok-1", "accept");
      });

      // Assert
      expect(ok).toBe(false);
      expect(setInvitations).not.toHaveBeenCalled();
      expect(refreshData).not.toHaveBeenCalled();
    });

    it("should rethrow when the API call fails", async () => {
      // Arrange
      mockApi.respondToInvitation.mockRejectedValue(new Error("respond failed"));
      const { result } = setup();

      // Act & Assert
      await expect(result.current.respondToInvitation("tok-1", "accept")).rejects.toThrow(
        "respond failed",
      );
    });
  });

  describe("getInvitationByToken", () => {
    it("should return the invitation enriched with its extras when the API call succeeds", async () => {
      // Arrange
      mockApi.getInvitationByToken.mockResolvedValue({
        ...RAW_INVITATION,
        type: "link",
        permissions: { role: "editor" },
        inviter: { name: "Ana" },
      });
      const { result } = setup();

      // Act
      let invitation: any;
      await act(async () => {
        invitation = await result.current.getInvitationByToken("tok-1");
      });

      // Assert
      expect(invitation).toMatchObject({
        id: "inv-1",
        type: "link",
        permissions: { role: "editor" },
        inviter: { name: "Ana" },
      });
    });

    it("should rethrow when the API call fails", async () => {
      // Arrange
      mockApi.getInvitationByToken.mockRejectedValue(new Error("token failed"));
      const { result } = setup();

      // Act & Assert
      await expect(result.current.getInvitationByToken("tok-1")).rejects.toThrow("token failed");
    });
  });

  describe("getTripInvitationLink", () => {
    it("should return the link payload and default force to false when not provided", async () => {
      // Arrange
      mockApi.getTripInvitationLink.mockResolvedValue({ token: "tok-1", link: "https://x/tok-1" });
      const { result } = setup();

      // Act
      let link: { token: string; link: string } | undefined;
      await act(async () => {
        link = await result.current.getTripInvitationLink("trip-1");
      });

      // Assert
      expect(mockApi.getTripInvitationLink).toHaveBeenCalledWith("trip-1", false);
      expect(link).toEqual({ token: "tok-1", link: "https://x/tok-1" });
    });

    it("should forward force to the API when a renewal is requested", async () => {
      // Arrange
      mockApi.getTripInvitationLink.mockResolvedValue({ token: "tok-2", link: "https://x/tok-2" });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.getTripInvitationLink("trip-1", true);
      });

      // Assert
      expect(mockApi.getTripInvitationLink).toHaveBeenCalledWith("trip-1", true);
    });

    it("should rethrow when the API call fails", async () => {
      // Arrange
      mockApi.getTripInvitationLink.mockRejectedValue(new Error("link failed"));
      const { result } = setup();

      // Act & Assert
      await expect(result.current.getTripInvitationLink("trip-1")).rejects.toThrow("link failed");
    });
  });

  describe("cancelInvitation", () => {
    it("should return the success flag reported by the API", async () => {
      // Arrange
      mockApi.cancelInvitation.mockResolvedValue({ success: true });
      const { result } = setup();

      // Act
      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.cancelInvitation("inv-1");
      });

      // Assert
      expect(mockApi.cancelInvitation).toHaveBeenCalledWith("inv-1");
      expect(ok).toBe(true);
    });

    it("should rethrow when the API call fails", async () => {
      // Arrange
      mockApi.cancelInvitation.mockRejectedValue(new Error("cancel failed"));
      const { result } = setup();

      // Act & Assert
      await expect(result.current.cancelInvitation("inv-1")).rejects.toThrow("cancel failed");
    });
  });
});
