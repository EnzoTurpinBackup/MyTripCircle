import React, { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react-native";
import { Friend, FriendRequest, FriendSuggestion } from "../../types";
import { FriendsProvider, useFriends } from "../FriendsContext";
import { CACHE_KEYS, CACHE_TTL } from "../../utils/cacheManager";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("../../services/ApiService", () => {
  const api = {
    getFriends: jest.fn(),
    getFriendRequests: jest.fn(),
    getFriendSuggestions: jest.fn(),
    sendFriendRequest: jest.fn(),
    respondToFriendRequest: jest.fn(),
    cancelFriendRequest: jest.fn(),
    removeFriend: jest.fn(),
  };
  return { __esModule: true, default: api, ApiService: api };
});

jest.mock("../AuthContext", () => ({ useAuth: jest.fn() }));

jest.mock("../../utils/cacheManager", () => {
  const actual = jest.requireActual("../../utils/cacheManager");
  return {
    CACHE_KEYS: actual.CACHE_KEYS,
    CACHE_TTL: actual.CACHE_TTL,
    CacheManager: {
      get: jest.fn(),
      getStale: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn(),
      clearAll: jest.fn(),
    },
  };
});

const mockApi = jest.requireMock("../../services/ApiService").default;
const mockUseAuth = jest.requireMock("../AuthContext").useAuth as jest.Mock;
const mockCache = jest.requireMock("../../utils/cacheManager").CacheManager;

const NOW = new Date("2026-06-15T12:00:00.000Z");
const USER = { id: "user-1", name: "Ada", email: "ada@example.com", createdAt: NOW };

const FRIEND: Friend = {
  id: "friend-1",
  userId: "user-1",
  friendId: "user-2",
  name: "Grace",
  email: "grace@example.com",
  createdAt: NOW,
};

const REQUEST: FriendRequest = {
  id: "request-1",
  senderId: "user-3",
  senderName: "Alan",
  status: "pending",
  createdAt: NOW,
};

const SUGGESTION: FriendSuggestion = {
  id: "suggestion-1",
  name: "Edsger",
  email: "edsger@example.com",
  commonFriends: 2,
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <FriendsProvider>{children}</FriendsProvider>
);

const renderFriends = async () => {
  const rendered = renderHook(() => useFriends(), { wrapper });
  await act(async () => {});
  return rendered;
};

/** Alimente le cache local pour chaque clé, `null` valant « rien en cache ». */
const givenCache = (values: Record<string, unknown>) => {
  mockCache.getStale.mockImplementation((key: string) =>
    Promise.resolve(values[key] ?? null),
  );
};

describe("FriendsContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    givenCache({});
    mockCache.set.mockResolvedValue(undefined);
    mockCache.invalidate.mockResolvedValue(undefined);
    mockApi.getFriends.mockResolvedValue([]);
    mockApi.getFriendRequests.mockResolvedValue([]);
    mockApi.getFriendSuggestions.mockResolvedValue([]);
    mockUseAuth.mockReturnValue({ user: USER, loading: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("useFriends", () => {
    it("should throw when used outside of a FriendsProvider", () => {
      // Arrange
      jest.spyOn(console, "error").mockImplementation(() => {});

      // Act & Assert
      expect(() => renderHook(() => useFriends())).toThrow(
        "useFriends must be used within a FriendsProvider",
      );
    });
  });

  describe("chargement initial", () => {
    it("should not touch the cache while authentication is still resolving", async () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: null, loading: true });

      // Act
      const { result } = await renderFriends();

      // Assert
      expect(mockCache.getStale).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
      expect(mockApi.getFriends).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(true);
    });

    it("should fetch friends, requests and suggestions when a user is signed in", async () => {
      // Arrange
      mockApi.getFriends.mockResolvedValue([FRIEND]);
      mockApi.getFriendRequests.mockResolvedValue([REQUEST]);
      mockApi.getFriendSuggestions.mockResolvedValue([SUGGESTION]);

      // Act
      const { result } = await renderFriends();

      // Assert
      expect(result.current.friends).toEqual([FRIEND]);
      expect(result.current.friendRequests).toEqual([REQUEST]);
      expect(result.current.suggestions).toEqual([SUGGESTION]);
      expect(result.current.loading).toBe(false);
    });

    it("should keep the spinner up while the network answers when nothing is cached", async () => {
      // Arrange
      givenCache({});
      mockApi.getFriends.mockReturnValue(new Promise(() => {}));

      // Act
      const { result } = await renderFriends();

      // Assert
      expect(result.current.loading).toBe(true);
    });

    it("should show the cached data without a spinner while the network answers", async () => {
      // Arrange
      givenCache({
        [CACHE_KEYS.FRIENDS]: [FRIEND],
        [CACHE_KEYS.FRIEND_REQUESTS]: [REQUEST],
        [CACHE_KEYS.FRIEND_SUGGESTIONS]: [SUGGESTION],
      });
      mockApi.getFriends.mockReturnValue(new Promise(() => {}));
      mockApi.getFriendRequests.mockReturnValue(new Promise(() => {}));
      mockApi.getFriendSuggestions.mockReturnValue(new Promise(() => {}));

      // Act
      const { result } = await renderFriends();

      // Assert
      expect(result.current.friends).toEqual([FRIEND]);
      expect(result.current.friendRequests).toEqual([REQUEST]);
      expect(result.current.suggestions).toEqual([SUGGESTION]);
      expect(result.current.loading).toBe(false);
    });

    it("should hydrate only the lists actually present in the cache", async () => {
      // Arrange
      givenCache({ [CACHE_KEYS.FRIENDS]: [FRIEND] });
      mockApi.getFriends.mockReturnValue(new Promise(() => {}));
      mockApi.getFriendRequests.mockReturnValue(new Promise(() => {}));
      mockApi.getFriendSuggestions.mockReturnValue(new Promise(() => {}));

      // Act
      const { result } = await renderFriends();

      // Assert
      expect(result.current.friends).toEqual([FRIEND]);
      expect(result.current.friendRequests).toEqual([]);
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it("should drop duplicated friend requests returned by the API", async () => {
      // Arrange
      const duplicate = { ...REQUEST, senderName: "Alan (doublon)" };
      mockApi.getFriendRequests.mockResolvedValue([
        REQUEST,
        duplicate,
        { ...REQUEST, id: "request-2" },
      ]);

      // Act
      const { result } = await renderFriends();

      // Assert
      expect(result.current.friendRequests).toEqual([
        REQUEST,
        { ...REQUEST, id: "request-2" },
      ]);
    });
  });

  describe("déconnexion", () => {
    it("should clear every list and invalidate the cache when no user is signed in", async () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: null, loading: false });

      // Act
      const { result } = await renderFriends();

      // Assert
      expect(result.current.friends).toEqual([]);
      expect(result.current.friendRequests).toEqual([]);
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(mockCache.invalidate).toHaveBeenCalledWith(CACHE_KEYS.FRIENDS);
      expect(mockCache.invalidate).toHaveBeenCalledWith(CACHE_KEYS.FRIEND_REQUESTS);
      expect(mockCache.invalidate).toHaveBeenCalledWith(CACHE_KEYS.FRIEND_SUGGESTIONS);
      expect(mockApi.getFriends).not.toHaveBeenCalled();
    });

    it("should ignore a cache invalidation failure when no user is signed in", async () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: null, loading: false });
      mockCache.invalidate.mockRejectedValue(new Error("stockage indisponible"));

      // Act
      const { result } = await renderFriends();

      // Assert
      expect(result.current.friends).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it("should not refresh anything when no user is signed in", async () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: null, loading: false });
      const { result } = await renderFriends();

      // Act
      await act(async () => {
        await result.current.refreshFriends();
        await result.current.refreshFriendRequests();
        await result.current.refreshSuggestions();
      });

      // Assert
      expect(mockApi.getFriends).not.toHaveBeenCalled();
      expect(mockApi.getFriendRequests).not.toHaveBeenCalled();
      expect(mockApi.getFriendSuggestions).not.toHaveBeenCalled();
    });
  });

  describe("synchronisation du cache", () => {
    it("should write every list to the cache once the network data has been loaded", async () => {
      // Arrange
      mockApi.getFriends.mockResolvedValue([FRIEND]);
      mockApi.getFriendRequests.mockResolvedValue([REQUEST]);
      mockApi.getFriendSuggestions.mockResolvedValue([SUGGESTION]);

      // Act
      await renderFriends();

      // Assert
      expect(mockCache.set).toHaveBeenCalledWith(
        CACHE_KEYS.FRIENDS,
        [FRIEND],
        CACHE_TTL.FRIENDS,
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        CACHE_KEYS.FRIEND_REQUESTS,
        [REQUEST],
        CACHE_TTL.FRIEND_REQUESTS,
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        CACHE_KEYS.FRIEND_SUGGESTIONS,
        [SUGGESTION],
        CACHE_TTL.FRIEND_SUGGESTIONS,
      );
    });

    it("should keep the loaded data usable when writing to the cache fails", async () => {
      // Arrange
      mockCache.set.mockRejectedValue(new Error("stockage plein"));
      mockApi.getFriends.mockResolvedValue([FRIEND]);

      // Act
      const { result } = await renderFriends();

      // Assert
      expect(result.current.friends).toEqual([FRIEND]);
      expect(result.current.loading).toBe(false);
    });
  });

  describe("erreurs de chargement", () => {
    it("should keep an empty friend list when the friends request fails", async () => {
      // Arrange
      mockApi.getFriends.mockRejectedValue(new Error("503"));
      mockApi.getFriendRequests.mockResolvedValue([REQUEST]);

      // Act
      const { result } = await renderFriends();

      // Assert
      expect(result.current.friends).toEqual([]);
      expect(result.current.friendRequests).toEqual([REQUEST]);
      expect(result.current.loading).toBe(false);
      expect(console.error).toHaveBeenCalledWith("Error loading friends:", expect.any(Error));
    });

    it("should keep an empty request list when the friend requests fetch fails", async () => {
      // Arrange
      mockApi.getFriendRequests.mockRejectedValue(new Error("503"));

      // Act
      const { result } = await renderFriends();

      // Assert
      expect(result.current.friendRequests).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        "Error loading friend requests:",
        expect.any(Error),
      );
    });

    it("should keep an empty suggestion list when the suggestions fetch fails", async () => {
      // Arrange
      mockApi.getFriendSuggestions.mockRejectedValue(new Error("503"));

      // Act
      const { result } = await renderFriends();

      // Assert
      expect(result.current.suggestions).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        "Error loading suggestions:",
        expect.any(Error),
      );
    });
  });

  describe("sendFriendRequest", () => {
    it("should remove the invited contact from the suggestions when inviting by email", async () => {
      // Arrange
      const otherSuggestion = { ...SUGGESTION, id: "suggestion-2", email: "linus@example.com" };
      mockApi.getFriendSuggestions.mockResolvedValue([SUGGESTION, otherSuggestion]);
      mockApi.sendFriendRequest.mockResolvedValue({ autoAccepted: false });
      const { result } = await renderFriends();
      // Le rafraîchissement de fond ne doit pas masquer la suppression optimiste
      mockApi.getFriendSuggestions.mockReturnValue(new Promise(() => {}));

      // Act
      await act(async () => {
        await result.current.sendFriendRequest({ recipientEmail: SUGGESTION.email });
      });

      // Assert
      expect(result.current.suggestions).toEqual([otherSuggestion]);
    });

    it("should refresh the friend list when the request is auto accepted", async () => {
      // Arrange
      mockApi.sendFriendRequest.mockResolvedValue({ autoAccepted: true });
      const { result } = await renderFriends();
      mockApi.getFriends.mockClear();

      // Act
      await act(async () => {
        await result.current.sendFriendRequest({ recipientEmail: "grace@example.com" });
      });

      // Assert
      expect(mockApi.getFriends).toHaveBeenCalledTimes(1);
    });

    it("should not refresh the friend list when the request stays pending", async () => {
      // Arrange
      mockApi.sendFriendRequest.mockResolvedValue({ autoAccepted: false });
      const { result } = await renderFriends();
      mockApi.getFriends.mockClear();
      mockApi.getFriendRequests.mockClear();

      // Act
      await act(async () => {
        await result.current.sendFriendRequest({ recipientEmail: "grace@example.com" });
      });

      // Assert
      expect(mockApi.getFriends).not.toHaveBeenCalled();
      expect(mockApi.getFriendRequests).toHaveBeenCalledTimes(1);
    });

    it("should keep the suggestions untouched when inviting by phone number", async () => {
      // Arrange
      mockApi.getFriendSuggestions.mockResolvedValue([SUGGESTION]);
      mockApi.sendFriendRequest.mockResolvedValue({ autoAccepted: false });
      const { result } = await renderFriends();

      // Act
      await act(async () => {
        await result.current.sendFriendRequest({ recipientPhone: "0600000000" });
      });

      // Assert
      expect(result.current.suggestions).toEqual([SUGGESTION]);
    });

    it("should return an empty result when the API answers nothing", async () => {
      // Arrange
      mockApi.sendFriendRequest.mockResolvedValue(undefined);
      const { result } = await renderFriends();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.sendFriendRequest({ recipientPhone: "0600000000" });
      });

      // Assert
      expect(outcome).toEqual({});
    });

    it("should rethrow when the invitation request fails", async () => {
      // Arrange
      mockApi.sendFriendRequest.mockRejectedValue(new Error("Utilisateur introuvable"));
      const { result } = await renderFriends();

      // Act
      let thrown: unknown;
      await act(async () => {
        await result.current
          .sendFriendRequest({ recipientEmail: "ghost@example.com" })
          .catch((err) => {
            thrown = err;
          });
      });

      // Assert
      expect(thrown).toEqual(new Error("Utilisateur introuvable"));
      expect(console.error).toHaveBeenCalledWith(
        "Error sending friend request:",
        expect.any(Error),
      );
    });
  });

  describe("respondToFriendRequest", () => {
    it("should refresh friends, requests and suggestions when a request is accepted", async () => {
      // Arrange
      mockApi.respondToFriendRequest.mockResolvedValue(undefined);
      const { result } = await renderFriends();
      mockApi.getFriends.mockClear();
      mockApi.getFriendRequests.mockClear();
      mockApi.getFriendSuggestions.mockClear();

      // Act
      await act(async () => {
        await result.current.respondToFriendRequest("request-1", "accept");
      });

      // Assert
      expect(mockApi.respondToFriendRequest).toHaveBeenCalledWith("request-1", "accept");
      expect(mockApi.getFriends).toHaveBeenCalledTimes(1);
      expect(mockApi.getFriendRequests).toHaveBeenCalledTimes(1);
      expect(mockApi.getFriendSuggestions).toHaveBeenCalledTimes(1);
    });

    it("should rethrow when answering a request fails", async () => {
      // Arrange
      mockApi.respondToFriendRequest.mockRejectedValue(new Error("Demande expirée"));
      const { result } = await renderFriends();

      // Act
      let thrown: unknown;
      await act(async () => {
        await result.current.respondToFriendRequest("request-1", "decline").catch((err) => {
          thrown = err;
        });
      });

      // Assert
      expect(thrown).toEqual(new Error("Demande expirée"));
    });
  });

  describe("cancelFriendRequest", () => {
    it("should refresh the pending requests when a sent request is cancelled", async () => {
      // Arrange
      mockApi.cancelFriendRequest.mockResolvedValue(undefined);
      const { result } = await renderFriends();
      mockApi.getFriendRequests.mockClear();

      // Act
      await act(async () => {
        await result.current.cancelFriendRequest("request-1");
      });

      // Assert
      expect(mockApi.cancelFriendRequest).toHaveBeenCalledWith("request-1");
      expect(mockApi.getFriendRequests).toHaveBeenCalledTimes(1);
    });

    it("should rethrow when cancelling a request fails", async () => {
      // Arrange
      mockApi.cancelFriendRequest.mockRejectedValue(new Error("Demande introuvable"));
      const { result } = await renderFriends();

      // Act
      let thrown: unknown;
      await act(async () => {
        await result.current.cancelFriendRequest("request-1").catch((err) => {
          thrown = err;
        });
      });

      // Assert
      expect(thrown).toEqual(new Error("Demande introuvable"));
    });
  });

  describe("removeFriend", () => {
    it("should refresh friends and suggestions when a friend is removed", async () => {
      // Arrange
      mockApi.removeFriend.mockResolvedValue(undefined);
      const { result } = await renderFriends();
      mockApi.getFriends.mockClear();
      mockApi.getFriendSuggestions.mockClear();

      // Act
      await act(async () => {
        await result.current.removeFriend("friend-1");
      });

      // Assert
      expect(mockApi.removeFriend).toHaveBeenCalledWith("friend-1");
      expect(mockApi.getFriends).toHaveBeenCalledTimes(1);
      expect(mockApi.getFriendSuggestions).toHaveBeenCalledTimes(1);
    });

    it("should rethrow when removing a friend fails", async () => {
      // Arrange
      mockApi.removeFriend.mockRejectedValue(new Error("Ami introuvable"));
      const { result } = await renderFriends();

      // Act
      let thrown: unknown;
      await act(async () => {
        await result.current.removeFriend("friend-1").catch((err) => {
          thrown = err;
        });
      });

      // Assert
      expect(thrown).toEqual(new Error("Ami introuvable"));
    });
  });
});
