import React, { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react-native";
import { Subscription } from "../../types";
import { SubscriptionProvider, useSubscription } from "../SubscriptionContext";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("../../services/ApiService", () => {
  const api = {
    getSubscription: jest.fn(),
    validatePurchase: jest.fn(),
    cancelSubscription: jest.fn(),
  };
  return { __esModule: true, default: api, ApiService: api };
});

jest.mock("../AuthContext", () => ({ useAuth: jest.fn() }));

// `react-native-iap` est requis paresseusement par le contexte : la fabrique est
// donc évaluée au moment de l'achat, ce qui permet de simuler son indisponibilité.
const mockIap = { requestPurchase: jest.fn(), finishTransaction: jest.fn() };
let mockIapUnavailable = false;
jest.mock("react-native-iap", () => {
  if (mockIapUnavailable) throw new Error("IAP indisponible");
  return mockIap;
});

const mockAsyncStorage = jest.requireMock("@react-native-async-storage/async-storage");
const mockApi = jest.requireMock("../../services/ApiService").default;
const mockUseAuth = jest.requireMock("../AuthContext").useAuth as jest.Mock;

const STORAGE_KEY = "subscription";
const NOW = new Date("2026-06-15T12:00:00.000Z");
const USER = { id: "user-1", name: "Ada", email: "ada@example.com", createdAt: NOW };

const makeSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: "sub-1",
  userId: "user-1",
  plan: "free",
  status: "active",
  features: {
    maxTrips: 3,
    maxCollaborators: 2,
    canExport: false,
    prioritySupport: false,
    maxAttachments: 5,
  },
  startDate: new Date("2026-01-01T00:00:00.000Z"),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <SubscriptionProvider>{children}</SubscriptionProvider>
);

const renderSubscription = async () => {
  const rendered = renderHook(() => useSubscription(), { wrapper });
  await act(async () => {});
  return rendered;
};

/** Rend le contexte avec l'abonnement renvoyé par le serveur déjà chargé. */
const renderWith = async (subscription: Subscription | null) => {
  mockApi.getSubscription.mockResolvedValue(subscription);
  return renderSubscription();
};

describe("SubscriptionContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: NOW });
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});

    mockIapUnavailable = false;
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    mockApi.getSubscription.mockResolvedValue(makeSubscription());
    mockUseAuth.mockReturnValue({ user: USER, loading: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe("useSubscription", () => {
    it("should throw when used outside of a SubscriptionProvider", () => {
      // Arrange
      jest.spyOn(console, "error").mockImplementation(() => {});

      // Act & Assert
      expect(() => renderHook(() => useSubscription())).toThrow(
        "useSubscription must be used within a SubscriptionProvider",
      );
    });
  });

  describe("chargement initial", () => {
    it("should wait without querying the API while authentication is still resolving", async () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: null, loading: true });

      // Act
      const { result } = await renderSubscription();

      // Assert
      expect(mockApi.getSubscription).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(true);
      expect(result.current.subscription).toBeNull();
    });

    it("should drop the subscription and its cache when no user is signed in", async () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: null, loading: false });

      // Act
      const { result } = await renderSubscription();

      // Assert
      expect(result.current.subscription).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
      expect(mockApi.getSubscription).not.toHaveBeenCalled();
    });

    it("should ignore a cache removal failure when no user is signed in", async () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: null, loading: false });
      mockAsyncStorage.removeItem.mockRejectedValue(new Error("stockage plein"));

      // Act
      const { result } = await renderSubscription();

      // Assert
      expect(result.current.subscription).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("should fetch the subscription from the server and cache it when a user is signed in", async () => {
      // Arrange
      const serverSubscription = makeSubscription({ plan: "premium" });
      mockApi.getSubscription.mockResolvedValue(serverSubscription);

      // Act
      const { result } = await renderSubscription();

      // Assert
      expect(result.current.subscription).toEqual(serverSubscription);
      expect(result.current.loading).toBe(false);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify(serverSubscription),
      );
    });

    it("should hydrate the cached subscription with revived dates before the server answers", async () => {
      // Arrange
      const cached = {
        ...makeSubscription({ plan: "premium", status: "cancelled" }),
        endDate: "2026-12-31T00:00:00.000Z",
        cancelledAt: "2026-06-01T00:00:00.000Z",
        nextBillingDate: "2026-07-01T00:00:00.000Z",
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cached));
      mockApi.getSubscription.mockReturnValue(new Promise(() => {}));

      // Act
      const { result } = await renderSubscription();

      // Assert
      expect(result.current.subscription).toMatchObject({
        plan: "premium",
        startDate: new Date(cached.startDate),
        endDate: new Date(cached.endDate),
        cancelledAt: new Date(cached.cancelledAt),
        nextBillingDate: new Date(cached.nextBillingDate),
        createdAt: new Date(cached.createdAt),
        updatedAt: new Date(cached.updatedAt),
      });
    });

    it("should leave the optional dates undefined when the cached subscription omits them", async () => {
      // Arrange
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(makeSubscription()));
      mockApi.getSubscription.mockReturnValue(new Promise(() => {}));

      // Act
      const { result } = await renderSubscription();

      // Assert
      expect(result.current.subscription?.endDate).toBeUndefined();
      expect(result.current.subscription?.cancelledAt).toBeUndefined();
      expect(result.current.subscription?.nextBillingDate).toBeUndefined();
    });

    it("should expose a load error when the server request fails", async () => {
      // Arrange
      mockApi.getSubscription.mockRejectedValue(new Error("503"));

      // Act
      const { result } = await renderSubscription();

      // Assert
      expect(result.current.error).toBe("Failed to load subscription");
      expect(result.current.loading).toBe(false);
    });
  });

  describe("refreshSubscription", () => {
    it("should replace the subscription and refresh the cache when the server answers", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());
      const refreshed = makeSubscription({ plan: "premium" });
      mockApi.getSubscription.mockResolvedValue(refreshed);

      // Act
      await act(async () => {
        await result.current.refreshSubscription();
      });

      // Assert
      expect(result.current.subscription).toEqual(refreshed);
      expect(result.current.error).toBeNull();
      expect(mockAsyncStorage.setItem).toHaveBeenLastCalledWith(
        STORAGE_KEY,
        JSON.stringify(refreshed),
      );
    });

    it("should expose a refresh error and rethrow when the server request fails", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());
      mockApi.getSubscription.mockRejectedValue(new Error("503"));

      // Act
      let thrown: unknown;
      await act(async () => {
        await result.current.refreshSubscription().catch((err) => {
          thrown = err;
        });
      });

      // Assert
      expect(thrown).toEqual(new Error("503"));
      expect(result.current.error).toBe("Failed to refresh subscription");
      expect(result.current.loading).toBe(false);
    });
  });

  describe("purchaseSubscription", () => {
    const IOS_PURCHASE = {
      transactionReceipt: "receipt-ios",
      transactionId: "tx-1",
    };

    it("should validate the receipt, close the transaction and refresh the subscription on success", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());
      mockIap.requestPurchase.mockResolvedValue(IOS_PURCHASE);
      mockApi.validatePurchase.mockResolvedValue({ success: true });

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.purchaseSubscription("premium_monthly");
      });

      // Assert
      expect(outcome).toBe(true);
      expect(mockApi.validatePurchase).toHaveBeenCalledWith({
        receiptData: "receipt-ios",
        platform: "ios",
        productId: "premium_monthly",
        transactionId: "tx-1",
      });
      expect(mockIap.finishTransaction).toHaveBeenCalledWith(IOS_PURCHASE);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it("should report an android purchase when the receipt only carries a purchase token", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());
      mockIap.requestPurchase.mockResolvedValue({ purchaseToken: "token-android" });
      mockApi.validatePurchase.mockResolvedValue({ success: true });

      // Act
      await act(async () => {
        await result.current.purchaseSubscription("premium_monthly");
      });

      // Assert
      expect(mockApi.validatePurchase).toHaveBeenCalledWith({
        receiptData: "token-android",
        platform: "android",
        productId: "premium_monthly",
        transactionId: undefined,
      });
    });

    it("should fail when the store returns no receipt", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());
      mockIap.requestPurchase.mockResolvedValue({});

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.purchaseSubscription("premium_monthly");
      });

      // Assert
      expect(outcome).toBe(false);
      expect(result.current.error).toBe("Failed to get purchase receipt");
      expect(mockApi.validatePurchase).not.toHaveBeenCalled();
    });

    it("should fail when the backend rejects the receipt", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());
      mockIap.requestPurchase.mockResolvedValue(IOS_PURCHASE);
      mockApi.validatePurchase.mockResolvedValue({ success: false });

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.purchaseSubscription("premium_monthly");
      });

      // Assert
      expect(outcome).toBe(false);
      expect(result.current.error).toBe("Failed to validate purchase");
      expect(mockIap.finishTransaction).not.toHaveBeenCalled();
    });

    it("should surface the store error message when the purchase rejects", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());
      mockIap.requestPurchase.mockRejectedValue(new Error("Achat annulé"));

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.purchaseSubscription("premium_monthly");
      });

      // Assert
      expect(outcome).toBe(false);
      expect(result.current.error).toBe("Achat annulé");
    });

    it("should use a default error message when the purchase rejects without one", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());
      mockIap.requestPurchase.mockRejectedValue({});

      // Act
      await act(async () => {
        await result.current.purchaseSubscription("premium_monthly");
      });

      // Assert
      expect(result.current.error).toBe("Failed to purchase subscription");
    });

    it("should fail gracefully when in-app purchases are unavailable in this environment", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());
      mockIapUnavailable = true;
      // Le module d'achat est requis paresseusement : vider le registre force sa
      // re-résolution, et donc l'échec du `require`.
      jest.resetModules();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.purchaseSubscription("premium_monthly");
      });

      // Assert
      expect(outcome).toBe(false);
      expect(result.current.error).toBe("In-app purchases not available in this environment");
      expect(console.warn).toHaveBeenCalledWith(
        "[SubscriptionContext] IAP non disponible (Expo Go ou non installé):",
        expect.any(Error),
      );
    });

    it("should stay silent about the unavailable store when not running in development", async () => {
      // Arrange
      const originalDev = (global as { __DEV__: boolean }).__DEV__;
      (global as { __DEV__: boolean }).__DEV__ = false;
      const { result } = await renderWith(makeSubscription());
      mockIapUnavailable = true;
      jest.resetModules();

      // Act
      await act(async () => {
        await result.current.purchaseSubscription("premium_monthly");
      });

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
      (global as { __DEV__: boolean }).__DEV__ = originalDev;
    });
  });

  describe("cancelSubscription", () => {
    it("should refresh the subscription when the cancellation is accepted", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());
      mockApi.cancelSubscription.mockResolvedValue({ success: true });

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.cancelSubscription();
      });

      // Assert
      expect(outcome).toBe(true);
      expect(mockApi.getSubscription).toHaveBeenCalledTimes(2);
      expect(result.current.error).toBeNull();
    });

    it("should surface the server message when the cancellation is refused", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());
      mockApi.cancelSubscription.mockResolvedValue({
        success: false,
        message: "Abonnement géré par le store",
      });

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.cancelSubscription();
      });

      // Assert
      expect(outcome).toBe(false);
      expect(result.current.error).toBe("Abonnement géré par le store");
    });

    it("should use a default message when the refusal carries no explanation", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());
      mockApi.cancelSubscription.mockResolvedValue({ success: false });

      // Act
      await act(async () => {
        await result.current.cancelSubscription();
      });

      // Assert
      expect(result.current.error).toBe("Failed to cancel subscription");
    });

    it("should surface the rejection message when the cancellation request fails", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());
      mockApi.cancelSubscription.mockRejectedValue(new Error("503"));

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.cancelSubscription();
      });

      // Assert
      expect(outcome).toBe(false);
      expect(result.current.error).toBe("503");
    });

    it("should use a default message when the cancellation rejects without one", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());
      mockApi.cancelSubscription.mockRejectedValue({});

      // Act
      await act(async () => {
        await result.current.cancelSubscription();
      });

      // Assert
      expect(result.current.error).toBe("Failed to cancel subscription");
    });
  });

  describe("canCreateTrip", () => {
    it("should allow up to three trips when no subscription is active", async () => {
      // Arrange
      const { result } = await renderWith(null);

      // Act & Assert
      expect(result.current.canCreateTrip(2)).toBe(true);
      expect(result.current.canCreateTrip(3)).toBe(false);
    });

    it("should allow the first trip when no count is provided", async () => {
      // Arrange
      const { result } = await renderWith(null);

      // Act & Assert
      expect(result.current.canCreateTrip()).toBe(true);
    });

    it("should allow unlimited trips when the active plan has no trip limit", async () => {
      // Arrange
      const unlimited = makeSubscription({
        plan: "premium",
        features: { ...makeSubscription().features, maxTrips: -1 },
      });
      const { result } = await renderWith(unlimited);

      // Act & Assert
      expect(result.current.canCreateTrip(999)).toBe(true);
    });

    it("should enforce the plan limit when the active plan caps the trips", async () => {
      // Arrange
      const capped = makeSubscription({
        plan: "premium",
        features: { ...makeSubscription().features, maxTrips: 10 },
      });
      const { result } = await renderWith(capped);

      // Act & Assert
      expect(result.current.canCreateTrip(9)).toBe(true);
      expect(result.current.canCreateTrip(10)).toBe(false);
    });
  });

  describe("canAddCollaborator", () => {
    it("should allow up to two collaborators when no subscription is active", async () => {
      // Arrange
      const { result } = await renderWith(null);

      // Act & Assert
      expect(result.current.canAddCollaborator(1)).toBe(true);
      expect(result.current.canAddCollaborator(2)).toBe(false);
    });

    it("should allow the first collaborator when no count is provided", async () => {
      // Arrange
      const { result } = await renderWith(null);

      // Act & Assert
      expect(result.current.canAddCollaborator()).toBe(true);
    });

    it("should allow unlimited collaborators when the active plan has no limit", async () => {
      // Arrange
      const unlimited = makeSubscription({
        plan: "premium",
        features: { ...makeSubscription().features, maxCollaborators: -1 },
      });
      const { result } = await renderWith(unlimited);

      // Act & Assert
      expect(result.current.canAddCollaborator(50)).toBe(true);
    });

    it("should enforce the plan limit when the active plan caps the collaborators", async () => {
      // Arrange
      const capped = makeSubscription({
        plan: "premium",
        features: { ...makeSubscription().features, maxCollaborators: 5 },
      });
      const { result } = await renderWith(capped);

      // Act & Assert
      expect(result.current.canAddCollaborator(4)).toBe(true);
      expect(result.current.canAddCollaborator(5)).toBe(false);
    });
  });

  describe("hasFeatureAccess", () => {
    it("should deny every feature when no subscription is active", async () => {
      // Arrange
      const { result } = await renderWith(null);

      // Act & Assert
      expect(result.current.hasFeatureAccess("canExport")).toBe(false);
    });

    it("should grant a boolean feature when the active plan enables it", async () => {
      // Arrange
      const withExport = makeSubscription({
        features: { ...makeSubscription().features, canExport: true },
      });
      const { result } = await renderWith(withExport);

      // Act & Assert
      expect(result.current.hasFeatureAccess("canExport")).toBe(true);
      expect(result.current.canExportData()).toBe(true);
    });

    it("should deny a boolean feature when the active plan disables it", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());

      // Act & Assert
      expect(result.current.canExportData()).toBe(false);
    });

    it("should grant a numeric feature only when it is unlimited", async () => {
      // Arrange
      const unlimited = makeSubscription({
        features: { ...makeSubscription().features, maxAttachments: -1 },
      });
      const { result } = await renderWith(unlimited);

      // Act & Assert
      expect(result.current.hasFeatureAccess("maxAttachments")).toBe(true);
    });

    it("should deny a numeric feature when it is capped", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription());

      // Act & Assert
      expect(result.current.hasFeatureAccess("maxAttachments")).toBe(false);
    });

    it("should keep a cancelled subscription usable until its end date", async () => {
      // Arrange
      const cancelled = makeSubscription({
        status: "cancelled",
        endDate: new Date("2026-12-31T00:00:00.000Z"),
        features: { ...makeSubscription().features, canExport: true },
      });
      const { result } = await renderWith(cancelled);

      // Act & Assert
      expect(result.current.canExportData()).toBe(true);
    });

    it("should deny access once a cancelled subscription has passed its end date", async () => {
      // Arrange
      const expired = makeSubscription({
        status: "cancelled",
        endDate: new Date("2026-01-31T00:00:00.000Z"),
        features: { ...makeSubscription().features, canExport: true },
      });
      const { result } = await renderWith(expired);

      // Act & Assert
      expect(result.current.canExportData()).toBe(false);
    });

    it("should deny access when a cancelled subscription has no end date", async () => {
      // Arrange
      const cancelled = makeSubscription({
        status: "cancelled",
        features: { ...makeSubscription().features, canExport: true },
      });
      const { result } = await renderWith(cancelled);

      // Act & Assert
      expect(result.current.canExportData()).toBe(false);
    });

    it("should deny access when the subscription is expired", async () => {
      // Arrange
      const expired = makeSubscription({
        status: "expired",
        features: { ...makeSubscription().features, canExport: true },
      });
      const { result } = await renderWith(expired);

      // Act & Assert
      expect(result.current.canExportData()).toBe(false);
    });
  });

  describe("isPremium", () => {
    it("should report a premium account when the premium plan is active", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription({ plan: "premium" }));

      // Act & Assert
      expect(result.current.isPremium()).toBe(true);
    });

    it("should not report a premium account when no subscription exists", async () => {
      // Arrange
      const { result } = await renderWith(null);

      // Act & Assert
      expect(result.current.isPremium()).toBe(false);
    });

    it("should not report a premium account when the active plan is free", async () => {
      // Arrange
      const { result } = await renderWith(makeSubscription({ plan: "free" }));

      // Act & Assert
      expect(result.current.isPremium()).toBe(false);
    });

    it("should keep reporting a premium account until a cancelled plan reaches its end date", async () => {
      // Arrange
      const cancelled = makeSubscription({
        plan: "premium",
        status: "cancelled",
        endDate: new Date("2026-12-31T00:00:00.000Z"),
      });
      const { result } = await renderWith(cancelled);

      // Act & Assert
      expect(result.current.isPremium()).toBe(true);
    });

    it("should stop reporting a premium account once a cancelled plan has expired", async () => {
      // Arrange
      const cancelled = makeSubscription({
        plan: "premium",
        status: "cancelled",
        endDate: new Date("2026-01-31T00:00:00.000Z"),
      });
      const { result } = await renderWith(cancelled);

      // Act & Assert
      expect(result.current.isPremium()).toBe(false);
    });

    it("should stop reporting a premium account when a cancelled plan has no end date", async () => {
      // Arrange
      const cancelled = makeSubscription({ plan: "premium", status: "cancelled" });
      const { result } = await renderWith(cancelled);

      // Act & Assert
      expect(result.current.isPremium()).toBe(false);
    });

    it("should stop reporting a premium account when the plan is expired", async () => {
      // Arrange
      const { result } = await renderWith(
        makeSubscription({ plan: "premium", status: "expired" }),
      );

      // Act & Assert
      expect(result.current.isPremium()).toBe(false);
    });
  });
});
