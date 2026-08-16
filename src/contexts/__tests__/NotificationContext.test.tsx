import React, { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react-native";
import { TripInvitation } from "../../types";
import { NotificationProvider, useNotifications } from "../NotificationContext";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("../TripsContext", () => ({ useTrips: jest.fn() }));

jest.mock("../AuthContext", () => ({ useAuth: jest.fn() }));

jest.mock("../../hooks/usePushNotifications", () => ({
  requestPermissionAndRegisterToken: jest.fn(),
  clearStoredPushToken: jest.fn(),
}));

jest.mock("../../screens/ConsentScreen", () => ({
  CONSENT_KEY: "@mytripcircle_consent_v1",
}));

const mockAsyncStorage = jest.requireMock("@react-native-async-storage/async-storage");
const mockUseTrips = jest.requireMock("../TripsContext").useTrips as jest.Mock;
const mockUseAuth = jest.requireMock("../AuthContext").useAuth as jest.Mock;
const mockPush = jest.requireMock("../../hooks/usePushNotifications");

/** Le drapeau `__DEV__` conditionne les avertissements : il est basculé dans les tests. */
const devGlobal = globalThis as unknown as { __DEV__: boolean };

const CONSENT_KEY = "@mytripcircle_consent_v1";
const NOW = new Date("2026-06-15T12:00:00.000Z");
const USER = { id: "user-1", name: "Ada", email: "ada@example.com", createdAt: NOW };
const READ_KEY = `notifications_read_${USER.id}`;

const makeInvitation = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "inv-1",
    tripId: "trip-1",
    inviterId: "user-2",
    status: "pending",
    token: "token-1",
    expiresAt: NOW,
    createdAt: NOW,
    ...overrides,
  }) as unknown as TripInvitation;

const wrapper = ({ children }: { children: ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

const renderNotifications = async () => {
  const rendered = renderHook(() => useNotifications(), { wrapper });
  await act(async () => {});
  return rendered;
};

/** Alimente le stockage clé par clé, toute clé absente valant `null`. */
const givenStorage = (values: Record<string, string | null>) => {
  mockAsyncStorage.getItem.mockImplementation((key: string) =>
    Promise.resolve(values[key] ?? null),
  );
};

describe("NotificationContext", () => {
  let getUserInvitations: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});

    getUserInvitations = jest.fn().mockResolvedValue([]);
    mockUseTrips.mockReturnValue({ getUserInvitations });
    mockUseAuth.mockReturnValue({ user: USER });
    givenStorage({});
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockPush.requestPermissionAndRegisterToken.mockResolvedValue(undefined);
    mockPush.clearStoredPushToken.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("useNotifications", () => {
    it("should throw when used outside of a NotificationProvider", () => {
      // Arrange
      jest.spyOn(console, "error").mockImplementation(() => {});

      // Act & Assert
      expect(() => renderHook(() => useNotifications())).toThrow(
        "useNotifications must be used within a NotificationProvider",
      );
    });
  });

  describe("chargement des invitations", () => {
    it("should load the pending invitations of the signed-in user", async () => {
      // Arrange
      const invitation = makeInvitation();
      getUserInvitations.mockResolvedValue([invitation]);

      // Act
      const { result } = await renderNotifications();

      // Assert
      expect(getUserInvitations).toHaveBeenCalledWith(USER.email, "pending");
      expect(result.current.invitations).toEqual([{ ...invitation, read: false }]);
      expect(result.current.unreadCount).toBe(1);
    });

    it("should mark the invitations already read according to the persisted identifiers", async () => {
      // Arrange
      const readInvitation = makeInvitation({ _id: "inv-read" });
      const newInvitation = makeInvitation({ _id: "inv-new" });
      givenStorage({ [READ_KEY]: JSON.stringify(["inv-read"]) });
      getUserInvitations.mockResolvedValue([readInvitation, newInvitation]);

      // Act
      const { result } = await renderNotifications();

      // Assert
      expect(result.current.invitations).toEqual([
        { ...readInvitation, read: true },
        { ...newInvitation, read: false },
      ]);
      expect(result.current.unreadCount).toBe(1);
      expect(result.current.readIds).toEqual(new Set(["inv-read"]));
    });

    it("should start with no read identifier when nothing has been persisted", async () => {
      // Arrange
      givenStorage({});

      // Act
      const { result } = await renderNotifications();

      // Assert
      expect(result.current.readIds).toEqual(new Set());
    });

    it("should keep the invitations empty when the trips service fails", async () => {
      // Arrange
      getUserInvitations.mockRejectedValue(new Error("503"));

      // Act
      const { result } = await renderNotifications();

      // Assert
      expect(result.current.invitations).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
      expect(console.error).toHaveBeenCalledWith("Error loading invitations:", expect.any(Error));
    });

    it("should reload the invitations when a refresh is requested", async () => {
      // Arrange
      const { result } = await renderNotifications();
      getUserInvitations.mockClear();
      getUserInvitations.mockResolvedValue([makeInvitation()]);

      // Act
      await act(async () => {
        await result.current.refreshInvitations();
      });

      // Assert
      expect(getUserInvitations).toHaveBeenCalledTimes(1);
      expect(result.current.invitations).toHaveLength(1);
    });

    it("should keep the read identifiers empty when reading them fails", async () => {
      // Arrange
      mockAsyncStorage.getItem.mockRejectedValue(new Error("stockage indisponible"));

      // Act
      const { result } = await renderNotifications();

      // Assert
      expect(result.current.readIds).toEqual(new Set());
      expect(console.warn).toHaveBeenCalledWith(
        "[NotificationContext] Erreur lecture readIds:",
        expect.any(Error),
      );
    });

    it("should stay silent about a failed read of the identifiers when not running in development", async () => {
      // Arrange
      const originalDev = devGlobal.__DEV__;
      devGlobal.__DEV__ = false;
      mockAsyncStorage.getItem.mockRejectedValue(new Error("stockage indisponible"));

      // Act
      await renderNotifications();

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
      devGlobal.__DEV__ = originalDev;
    });
  });

  describe("identification des invitations", () => {
    it("should identify an invitation by its Mongo identifier when it has one", async () => {
      // Arrange
      givenStorage({ [READ_KEY]: JSON.stringify(["mongo-id"]) });
      getUserInvitations.mockResolvedValue([
        makeInvitation({ _id: "mongo-id", id: "other-id", token: "other-token" }),
      ]);

      // Act
      const { result } = await renderNotifications();

      // Assert
      expect(result.current.invitations[0].read).toBe(true);
    });

    it("should fall back to the local identifier when there is no Mongo identifier", async () => {
      // Arrange
      givenStorage({ [READ_KEY]: JSON.stringify(["local-id"]) });
      getUserInvitations.mockResolvedValue([
        makeInvitation({ id: "local-id", token: "other-token" }),
      ]);

      // Act
      const { result } = await renderNotifications();

      // Assert
      expect(result.current.invitations[0].read).toBe(true);
    });

    it("should fall back to the invitation token when there is no identifier at all", async () => {
      // Arrange
      givenStorage({ [READ_KEY]: JSON.stringify(["token-only"]) });
      getUserInvitations.mockResolvedValue([
        makeInvitation({ id: undefined, token: "token-only" }),
      ]);

      // Act
      const { result } = await renderNotifications();

      // Assert
      expect(result.current.invitations[0].read).toBe(true);
    });

    it("should treat an invitation with no identifier and no token as unread", async () => {
      // Arrange
      givenStorage({ [READ_KEY]: JSON.stringify(["inv-1"]) });
      getUserInvitations.mockResolvedValue([
        makeInvitation({ id: undefined, token: undefined }),
      ]);

      // Act
      const { result } = await renderNotifications();

      // Assert
      expect(result.current.invitations[0].read).toBe(false);
      expect(result.current.unreadCount).toBe(1);
    });
  });

  describe("markAsRead", () => {
    it("should mark a single invitation as read and persist the identifier", async () => {
      // Arrange
      getUserInvitations.mockResolvedValue([
        makeInvitation({ _id: "inv-a" }),
        makeInvitation({ _id: "inv-b" }),
      ]);
      const { result } = await renderNotifications();

      // Act
      await act(async () => {
        result.current.markAsRead("inv-a");
      });

      // Assert
      expect(result.current.invitations[0].read).toBe(true);
      expect(result.current.invitations[1].read).toBe(false);
      expect(result.current.unreadCount).toBe(1);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        READ_KEY,
        JSON.stringify(["inv-a"]),
      );
    });

    it("should never let the unread counter go below zero", async () => {
      // Arrange
      givenStorage({ [READ_KEY]: JSON.stringify(["inv-a"]) });
      getUserInvitations.mockResolvedValue([makeInvitation({ _id: "inv-a" })]);
      const { result } = await renderNotifications();
      expect(result.current.unreadCount).toBe(0);

      // Act
      await act(async () => {
        result.current.markAsRead("inv-a");
      });

      // Assert
      expect(result.current.unreadCount).toBe(0);
    });

    it("should keep the invitation marked as read when persisting the identifiers fails", async () => {
      // Arrange
      getUserInvitations.mockResolvedValue([makeInvitation({ _id: "inv-a" })]);
      mockAsyncStorage.setItem.mockRejectedValue(new Error("stockage plein"));
      const { result } = await renderNotifications();

      // Act
      await act(async () => {
        result.current.markAsRead("inv-a");
      });

      // Assert
      expect(result.current.invitations[0].read).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(
        "[NotificationContext] Erreur persistance readIds:",
        expect.any(Error),
      );
    });

    it("should stay silent about a failed persistence when not running in development", async () => {
      // Arrange
      const originalDev = devGlobal.__DEV__;
      getUserInvitations.mockResolvedValue([makeInvitation({ _id: "inv-a" })]);
      mockAsyncStorage.setItem.mockRejectedValue(new Error("stockage plein"));
      const { result } = await renderNotifications();
      devGlobal.__DEV__ = false;

      // Act
      await act(async () => {
        result.current.markAsRead("inv-a");
      });

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
      devGlobal.__DEV__ = originalDev;
    });
  });

  describe("markAllAsRead", () => {
    it("should mark every invitation as read and persist all identifiers", async () => {
      // Arrange
      getUserInvitations.mockResolvedValue([
        makeInvitation({ _id: "inv-a" }),
        makeInvitation({ _id: "inv-b" }),
      ]);
      const { result } = await renderNotifications();

      // Act
      await act(async () => {
        result.current.markAllAsRead();
      });

      // Assert
      expect(result.current.invitations.every((inv) => inv.read)).toBe(true);
      expect(result.current.unreadCount).toBe(0);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        READ_KEY,
        JSON.stringify(["inv-a", "inv-b"]),
      );
    });
  });

  describe("jeton de notifications push", () => {
    it("should register the push token when the user consented to notifications", async () => {
      // Arrange
      givenStorage({ [CONSENT_KEY]: JSON.stringify({ notifications: true }) });

      // Act
      await renderNotifications();

      // Assert
      expect(mockPush.requestPermissionAndRegisterToken).toHaveBeenCalledTimes(1);
    });

    it("should not register the push token when the user refused notifications", async () => {
      // Arrange
      givenStorage({ [CONSENT_KEY]: JSON.stringify({ notifications: false }) });

      // Act
      await renderNotifications();

      // Assert
      expect(mockPush.requestPermissionAndRegisterToken).not.toHaveBeenCalled();
    });

    it("should not register the push token when no consent has been recorded", async () => {
      // Arrange
      givenStorage({});

      // Act
      await renderNotifications();

      // Assert
      expect(mockPush.requestPermissionAndRegisterToken).not.toHaveBeenCalled();
    });

    it("should not register the push token when the stored consent is unreadable", async () => {
      // Arrange
      givenStorage({ [CONSENT_KEY]: "{ ceci n'est pas du JSON" });

      // Act
      await renderNotifications();

      // Assert
      expect(mockPush.requestPermissionAndRegisterToken).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        "[NotificationContext] Erreur chargement préférences notifications:",
        expect.any(Error),
      );
    });

    it("should stay silent about an unreadable consent when not running in development", async () => {
      // Arrange
      const originalDev = devGlobal.__DEV__;
      devGlobal.__DEV__ = false;
      givenStorage({ [CONSENT_KEY]: "{ ceci n'est pas du JSON" });

      // Act
      await renderNotifications();

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
      devGlobal.__DEV__ = originalDev;
    });
  });

  describe("déconnexion", () => {
    it("should clear the notifications and the stored push token when no user is signed in", async () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: null });

      // Act
      const { result } = await renderNotifications();

      // Assert
      expect(result.current.invitations).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.readIds).toEqual(new Set());
      expect(mockPush.clearStoredPushToken).toHaveBeenCalledTimes(1);
      expect(getUserInvitations).not.toHaveBeenCalled();
    });

    it("should not query the invitations when no user is signed in", async () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: null });
      const { result } = await renderNotifications();

      // Act
      await act(async () => {
        await result.current.loadInvitations();
      });

      // Assert
      expect(getUserInvitations).not.toHaveBeenCalled();
    });

    it("should not persist any read identifier when no user is signed in", async () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: null });
      const { result } = await renderNotifications();

      // Act
      await act(async () => {
        result.current.markAsRead("inv-a");
      });

      // Assert
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
      expect(result.current.readIds).toEqual(new Set(["inv-a"]));
    });
  });
});
