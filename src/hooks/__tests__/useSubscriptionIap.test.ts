import { renderHook, act } from "@testing-library/react-native";
import * as React from "react";
import * as ReactNative from "react-native";
import type { useSubscriptionIap as UseSubscriptionIap } from "../useSubscriptionIap";

// Le hook décide au moment de son import s'il peut charger `react-native-iap`
// (absent d'Expo Go). Chaque scénario doit donc réinitialiser le registre de
// modules avant de le réimporter. React et les deux seules API React Native
// utilisées par le hook sont réinjectées telles quelles dans le registre neuf :
// sans cela deux instances de React coexistent, et l'espion posé sur `Alert`
// n'observe pas l'objet réellement appelé par le hook.
const { Alert, Platform } = ReactNative;
const REACT_NATIVE_STABLE = { Alert, Platform };

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockRequest = jest.fn();
jest.mock("../../services/api/apiCore", () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

const mockLoggerWarn = jest.fn();
jest.mock("../../utils/logger", () => ({
  __esModule: true,
  default: { warn: (...args: unknown[]) => mockLoggerWarn(...args), debug: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

const mockParseApiError = jest.fn();
jest.mock("../../utils/i18n", () => ({
  parseApiError: (error: unknown) => mockParseApiError(error),
}));

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

const PRODUCTS_CACHE_KEY = "subscription_products_cache";
const PRODUCT_IDS = ["com.myapp.monthly", "com.myapp.yearly"];

type Listener = (payload: unknown) => void | Promise<void>;

/** Faux module `react-native-iap` : capture les écouteurs pour les déclencher à la demande. */
function createIapModule() {
  const listeners: { purchaseUpdate?: Listener; purchaseError?: Listener } = {};
  const removePurchaseUpdate = jest.fn();
  const removePurchaseError = jest.fn();
  const module = {
    initConnection: jest.fn().mockResolvedValue(true),
    endConnection: jest.fn().mockResolvedValue(true),
    fetchProducts: jest.fn().mockResolvedValue([]),
    finishTransaction: jest.fn().mockResolvedValue(true),
    requestPurchase: jest.fn().mockResolvedValue(true),
    purchaseUpdatedListener: jest.fn((cb: Listener) => {
      listeners.purchaseUpdate = cb;
      return { remove: removePurchaseUpdate };
    }),
    purchaseErrorListener: jest.fn((cb: Listener) => {
      listeners.purchaseError = cb;
      return { remove: removePurchaseError };
    }),
  };
  return { module, listeners, removePurchaseUpdate, removePurchaseError };
}

interface LoadOptions {
  expoGo?: boolean;
  iapInstalled?: boolean;
  iap?: ReturnType<typeof createIapModule>["module"];
}

/** Recharge le hook dans un registre de modules neuf avec l'environnement voulu. */
function load({ expoGo = false, iapInstalled = true, iap }: LoadOptions = {}) {
  jest.resetModules();
  jest.doMock("react", () => React);
  jest.doMock("react-native", () => REACT_NATIVE_STABLE);
  jest.doMock("expo-constants", () => ({
    __esModule: true,
    default: { executionEnvironment: expoGo ? "storeClient" : "standalone" },
  }));
  if (iapInstalled) {
    jest.doMock("react-native-iap", () => iap ?? createIapModule().module);
  } else {
    jest.doMock("react-native-iap", () => {
      throw new Error("react-native-iap absent");
    });
  }

  const useSubscriptionIap: typeof UseSubscriptionIap = jest.requireActual(
    "../useSubscriptionIap",
  ).useSubscriptionIap;

  return { useSubscriptionIap };
}

describe("useSubscriptionIap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockParseApiError.mockReturnValue("");
    mockRequest.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("when the in-app purchase module is unavailable", () => {
    it("should report an Expo Go environment when the app runs in the store client", () => {
      // Arrange
      const { useSubscriptionIap } = load({ expoGo: true });

      // Act
      const { result } = renderHook(() => useSubscriptionIap());

      // Assert
      expect(result.current.isExpoGo).toBe(true);
    });

    it("should report an Expo Go environment when the native module cannot be required", () => {
      // Arrange
      const { useSubscriptionIap } = load({ iapInstalled: false });

      // Act
      const { result } = renderHook(() => useSubscriptionIap());

      // Assert
      expect(result.current.isExpoGo).toBe(true);
    });

    it("should log a warning when the native module cannot be required", () => {
      // Arrange & Act
      load({ iapInstalled: false });

      // Assert
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        "react-native-iap not available:",
        expect.any(Error),
      );
    });

    it("should expose the two translated placeholder offers", () => {
      // Arrange
      const { useSubscriptionIap } = load({ expoGo: true });

      // Act
      const { result } = renderHook(() => useSubscriptionIap());

      // Assert
      expect(result.current.products).toEqual([
        {
          productId: "com.myapp.monthly",
          title: "subscription.monthly",
          localizedPrice: "subscription.monthlyPrice",
        },
        {
          productId: "com.myapp.yearly",
          title: "subscription.annual",
          localizedPrice: "subscription.annualPrice",
        },
      ]);
    });

    it("should never read the products cache", async () => {
      // Arrange
      const { useSubscriptionIap } = load({ expoGo: true });

      // Act
      renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Assert
      expect(mockGetItem).not.toHaveBeenCalled();
    });

    it("should show the demo message instead of starting a purchase", async () => {
      // Arrange
      const { useSubscriptionIap } = load({ expoGo: true });
      const { result } = renderHook(() => useSubscriptionIap());

      // Act
      await act(async () => {
        await result.current.onSubscribe("com.myapp.monthly");
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "subscription.purchaseErrorTitle",
        "subscription.demoMessage",
        [{ text: "common.ok" }],
      );
      expect(result.current.loadingId).toBeNull();
    });
  });

  describe("product loading", () => {
    it("should hydrate the products from the disk cache when it holds a non-empty list", async () => {
      // Arrange
      const cached = [{ productId: "cached", title: "Cache", localizedPrice: "1 €" }];
      mockGetItem.mockResolvedValue(JSON.stringify(cached));
      const { useSubscriptionIap } = load();

      // Act
      const { result } = renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Assert
      expect(mockGetItem).toHaveBeenCalledWith(PRODUCTS_CACHE_KEY);
      expect(result.current.products).toEqual(cached);
    });

    it("should keep the placeholder offers when the cache holds an empty list", async () => {
      // Arrange
      mockGetItem.mockResolvedValue("[]");
      const { useSubscriptionIap } = load();

      // Act
      const { result } = renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Assert
      expect(result.current.products[0].productId).toBe("com.myapp.monthly");
    });

    it("should keep the placeholder offers when the cache holds something that is not a list", async () => {
      // Arrange
      mockGetItem.mockResolvedValue('{"productId":"seul"}');
      const { useSubscriptionIap } = load();

      // Act
      const { result } = renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Assert
      expect(result.current.products[0].productId).toBe("com.myapp.monthly");
    });

    it("should log a warning and keep the placeholder offers when the cache is corrupted", async () => {
      // Arrange
      mockGetItem.mockResolvedValue("{ pas du json");
      const { useSubscriptionIap } = load();

      // Act
      const { result } = renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Assert
      expect(mockLoggerWarn).toHaveBeenCalledWith("IAP cache read error", expect.any(Error));
      expect(result.current.products[0].productId).toBe("com.myapp.monthly");
    });

    it("should query the store for the subscription products", async () => {
      // Arrange
      const iap = createIapModule();
      const { useSubscriptionIap } = load({ iap: iap.module });

      // Act
      renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Assert
      expect(iap.module.initConnection).toHaveBeenCalledTimes(1);
      expect(iap.module.fetchProducts).toHaveBeenCalledWith({ skus: PRODUCT_IDS, type: "subs" });
    });

    it("should normalize the store products using their primary fields", async () => {
      // Arrange
      const iap = createIapModule();
      iap.module.fetchProducts.mockResolvedValue([
        { productId: "com.myapp.monthly", title: "Mensuel", localizedPrice: "4,99 €" },
      ]);
      const { useSubscriptionIap } = load({ iap: iap.module });

      // Act
      const { result } = renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Assert
      expect(result.current.products).toEqual([
        { productId: "com.myapp.monthly", title: "Mensuel", localizedPrice: "4,99 €" },
      ]);
    });

    it("should fall back to the alternate id and display price fields when normalizing", async () => {
      // Arrange
      const iap = createIapModule();
      iap.module.fetchProducts.mockResolvedValue([
        { id: "com.myapp.yearly", title: "Annuel", displayPrice: "49,99 €" },
      ]);
      const { useSubscriptionIap } = load({ iap: iap.module });

      // Act
      const { result } = renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Assert
      expect(result.current.products).toEqual([
        { productId: "com.myapp.yearly", title: "Annuel", localizedPrice: "49,99 €" },
      ]);
    });

    it("should write the normalized products to the disk cache", async () => {
      // Arrange
      const iap = createIapModule();
      const normalized = [{ productId: "com.myapp.monthly", title: "Mensuel", localizedPrice: "4,99 €" }];
      iap.module.fetchProducts.mockResolvedValue(normalized);
      const { useSubscriptionIap } = load({ iap: iap.module });

      // Act
      renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Assert
      expect(mockSetItem).toHaveBeenCalledWith(PRODUCTS_CACHE_KEY, JSON.stringify(normalized));
    });

    it("should ignore a failure to write the disk cache", async () => {
      // Arrange
      const iap = createIapModule();
      iap.module.fetchProducts.mockResolvedValue([
        { productId: "com.myapp.monthly", title: "Mensuel", localizedPrice: "4,99 €" },
      ]);
      mockSetItem.mockRejectedValue(new Error("disque plein"));
      const { useSubscriptionIap } = load({ iap: iap.module });

      // Act
      const { result } = renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Assert
      expect(result.current.products[0].title).toBe("Mensuel");
    });

    it("should keep the placeholder offers when the store returns no product", async () => {
      // Arrange
      const iap = createIapModule();
      iap.module.fetchProducts.mockResolvedValue([]);
      const { useSubscriptionIap } = load({ iap: iap.module });

      // Act
      const { result } = renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Assert
      expect(result.current.products[0].productId).toBe("com.myapp.monthly");
      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it("should keep the placeholder offers when the store returns nothing at all", async () => {
      // Arrange
      const iap = createIapModule();
      iap.module.fetchProducts.mockResolvedValue(null);
      const { useSubscriptionIap } = load({ iap: iap.module });

      // Act
      const { result } = renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Assert
      expect(result.current.products[0].productId).toBe("com.myapp.monthly");
    });

    it("should log a warning when the store connection fails", async () => {
      // Arrange
      const iap = createIapModule();
      iap.module.initConnection.mockRejectedValue(new Error("store injoignable"));
      const { useSubscriptionIap } = load({ iap: iap.module });

      // Act
      renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Assert
      expect(mockLoggerWarn).toHaveBeenCalledWith("IAP init error", expect.any(Error));
    });

    it("should not apply the store products when the hook unmounted before they arrived", async () => {
      // Arrange
      const iap = createIapModule();
      let releaseFetch: (value: unknown) => void = () => {};
      iap.module.fetchProducts.mockReturnValue(
        new Promise((resolve) => {
          releaseFetch = resolve;
        }),
      );
      const { useSubscriptionIap } = load({ iap: iap.module });
      const { result, unmount } = renderHook(() => useSubscriptionIap());

      // Act
      unmount();
      await act(async () => {
        releaseFetch([{ productId: "trop-tard", title: "Tard", localizedPrice: "9 €" }]);
      });

      // Assert
      expect(result.current.products[0].productId).toBe("com.myapp.monthly");
      expect(mockSetItem).not.toHaveBeenCalled();
    });
  });

  describe("purchase updates", () => {
    it("should validate the transaction receipt server-side before finishing the purchase", async () => {
      // Arrange
      const iap = createIapModule();
      const { useSubscriptionIap } = load({ iap: iap.module });
      renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Act
      await act(async () => {
        await iap.listeners.purchaseUpdate!({
          transactionReceipt: "reçu-1",
          productId: "com.myapp.monthly",
        });
      });

      // Assert
      expect(mockRequest).toHaveBeenCalledWith("/subscriptions/validate-receipt", "POST", {
        receipt: "reçu-1",
        platform: expect.any(String),
        productId: "com.myapp.monthly",
      });
      expect(iap.module.finishTransaction).toHaveBeenCalledTimes(1);
    });

    it("should accept a purchase token when there is no transaction receipt", async () => {
      // Arrange
      const iap = createIapModule();
      const { useSubscriptionIap } = load({ iap: iap.module });
      renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Act
      await act(async () => {
        await iap.listeners.purchaseUpdate!({ purchaseToken: "jeton-1", productId: "com.myapp.yearly" });
      });

      // Assert
      expect(mockRequest).toHaveBeenCalledWith(
        "/subscriptions/validate-receipt",
        "POST",
        expect.objectContaining({ receipt: "jeton-1" }),
      );
    });

    it("should confirm the purchase to the user when the receipt is valid", async () => {
      // Arrange
      const iap = createIapModule();
      const { useSubscriptionIap } = load({ iap: iap.module });
      renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Act
      await act(async () => {
        await iap.listeners.purchaseUpdate!({ transactionReceipt: "reçu-1" });
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "subscription.purchaseSuccessTitle",
        "subscription.purchaseSuccessMessage",
        [{ text: "common.ok" }],
      );
    });

    it("should ignore a purchase carrying neither receipt nor token", async () => {
      // Arrange
      const iap = createIapModule();
      const { useSubscriptionIap } = load({ iap: iap.module });
      renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Act
      await act(async () => {
        await iap.listeners.purchaseUpdate!({ productId: "com.myapp.monthly" });
      });

      // Assert
      expect(mockRequest).not.toHaveBeenCalled();
      expect(iap.module.finishTransaction).not.toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it("should not finish the transaction when the server rejects the receipt", async () => {
      // Arrange
      const iap = createIapModule();
      mockRequest.mockRejectedValue(new Error("reçu invalide"));
      const { useSubscriptionIap } = load({ iap: iap.module });
      renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Act
      await act(async () => {
        await iap.listeners.purchaseUpdate!({ transactionReceipt: "reçu-1" });
      });

      // Assert
      expect(iap.module.finishTransaction).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        "subscription.purchaseErrorTitle",
        "subscription.purchaseErrorMessage",
        [{ text: "common.ok" }],
      );
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        "purchase update handling error",
        expect.any(Error),
      );
    });

    it("should notify the caller once the validated transaction is finished", async () => {
      // Arrange
      const iap = createIapModule();
      const onPurchaseSuccess = jest.fn().mockResolvedValue(undefined);
      const { useSubscriptionIap } = load({ iap: iap.module });
      renderHook(() => useSubscriptionIap({ onPurchaseSuccess }));
      await act(async () => {});

      // Act
      await act(async () => {
        await iap.listeners.purchaseUpdate!({ transactionReceipt: "reçu-1" });
      });

      // Assert
      expect(onPurchaseSuccess).toHaveBeenCalledTimes(1);
      expect(iap.module.finishTransaction).toHaveBeenCalledTimes(1);
    });

    it("should not notify the caller when the server rejects the receipt", async () => {
      // Arrange
      const iap = createIapModule();
      const onPurchaseSuccess = jest.fn().mockResolvedValue(undefined);
      mockRequest.mockRejectedValue(new Error("reçu invalide"));
      const { useSubscriptionIap } = load({ iap: iap.module });
      renderHook(() => useSubscriptionIap({ onPurchaseSuccess }));
      await act(async () => {});

      // Act
      await act(async () => {
        await iap.listeners.purchaseUpdate!({ transactionReceipt: "reçu-1" });
      });

      // Assert
      expect(onPurchaseSuccess).not.toHaveBeenCalled();
    });

    it("should still confirm the purchase when the caller notification fails", async () => {
      // Arrange
      const iap = createIapModule();
      const onPurchaseSuccess = jest.fn().mockRejectedValue(new Error("réseau indisponible"));
      const { useSubscriptionIap } = load({ iap: iap.module });
      renderHook(() => useSubscriptionIap({ onPurchaseSuccess }));
      await act(async () => {});

      // Act
      await act(async () => {
        await iap.listeners.purchaseUpdate!({ transactionReceipt: "reçu-1" });
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "subscription.purchaseSuccessTitle",
        "subscription.purchaseSuccessMessage",
        [{ text: "common.ok" }],
      );
      expect(Alert.alert).not.toHaveBeenCalledWith(
        "subscription.purchaseErrorTitle",
        expect.anything(),
        expect.anything(),
      );
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        "subscription refresh after purchase error",
        expect.any(Error),
      );
    });

    it("should notify the latest callback when the caller rerenders with a new one", async () => {
      // Arrange
      const iap = createIapModule();
      const initial = jest.fn().mockResolvedValue(undefined);
      const latest = jest.fn().mockResolvedValue(undefined);
      const { useSubscriptionIap } = load({ iap: iap.module });
      const { rerender } = renderHook(
        ({ onPurchaseSuccess }: { onPurchaseSuccess: () => Promise<void> }) =>
          useSubscriptionIap({ onPurchaseSuccess }),
        { initialProps: { onPurchaseSuccess: initial } },
      );
      await act(async () => {});

      // Act
      rerender({ onPurchaseSuccess: latest });
      await act(async () => {
        await iap.listeners.purchaseUpdate!({ transactionReceipt: "reçu-1" });
      });

      // Assert
      expect(latest).toHaveBeenCalledTimes(1);
      expect(initial).not.toHaveBeenCalled();
      expect(iap.module.purchaseUpdatedListener).toHaveBeenCalledTimes(1);
    });
  });

  describe("purchase errors", () => {
    it("should surface the parsed message when the store reports an Error", async () => {
      // Arrange
      const iap = createIapModule();
      mockParseApiError.mockReturnValue("Paiement refusé");
      const { useSubscriptionIap } = load({ iap: iap.module });
      renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Act
      act(() => {
        iap.listeners.purchaseError!(new Error("declined"));
      });

      // Assert
      expect(mockParseApiError).toHaveBeenCalledWith(expect.any(Error));
      expect(Alert.alert).toHaveBeenCalledWith("subscription.purchaseErrorTitle", "Paiement refusé", [
        { text: "common.ok" },
      ]);
    });

    it("should rebuild an Error from a plain object carrying a message", async () => {
      // Arrange
      const iap = createIapModule();
      mockParseApiError.mockImplementation((error: unknown) => (error as Error).message);
      const { useSubscriptionIap } = load({ iap: iap.module });
      renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Act
      act(() => {
        iap.listeners.purchaseError!({ message: "E_USER_CANCELLED" });
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "subscription.purchaseErrorTitle",
        "E_USER_CANCELLED",
        [{ text: "common.ok" }],
      );
    });

    it("should fall back to a generic message when the store error carries no message", async () => {
      // Arrange
      const iap = createIapModule();
      mockParseApiError.mockReturnValue("");
      const { useSubscriptionIap } = load({ iap: iap.module });
      renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Act
      act(() => {
        iap.listeners.purchaseError!({ code: 42 });
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "subscription.purchaseErrorTitle",
        "subscription.purchaseErrorMessage",
        [{ text: "common.ok" }],
      );
    });

    it("should clear the pending purchase indicator when the store reports an error", async () => {
      // Arrange
      const iap = createIapModule();
      const { useSubscriptionIap } = load({ iap: iap.module });
      const { result } = renderHook(() => useSubscriptionIap());
      await act(async () => {});
      await act(async () => {
        await result.current.onSubscribe("com.myapp.monthly");
      });

      // Act
      act(() => {
        iap.listeners.purchaseError!(new Error("declined"));
      });

      // Assert
      expect(result.current.loadingId).toBeNull();
    });
  });

  describe("onSubscribe", () => {
    it("should request the purchase for both stores and mark the product as loading", async () => {
      // Arrange
      const iap = createIapModule();
      const { useSubscriptionIap } = load({ iap: iap.module });
      const { result } = renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Act
      await act(async () => {
        await result.current.onSubscribe("com.myapp.monthly");
      });

      // Assert
      expect(iap.module.requestPurchase).toHaveBeenCalledWith({
        type: "subs",
        request: {
          apple: { sku: "com.myapp.monthly" },
          google: { skus: ["com.myapp.monthly"] },
        },
      });
      expect(result.current.loadingId).toBe("com.myapp.monthly");
    });

    it("should alert the user and clear the indicator when the purchase request fails", async () => {
      // Arrange
      const iap = createIapModule();
      iap.module.requestPurchase.mockRejectedValue(new Error("achat impossible"));
      const { useSubscriptionIap } = load({ iap: iap.module });
      const { result } = renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Act
      await act(async () => {
        await result.current.onSubscribe("com.myapp.monthly");
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "subscription.purchaseErrorTitle",
        "subscription.purchaseErrorMessage",
        [{ text: "common.ok" }],
      );
      expect(result.current.loadingId).toBeNull();
      expect(mockLoggerWarn).toHaveBeenCalledWith("requestSubscription err", expect.any(Error));
    });
  });

  describe("teardown", () => {
    it("should remove both listeners and close the store connection on unmount", async () => {
      // Arrange
      const iap = createIapModule();
      const { useSubscriptionIap } = load({ iap: iap.module });
      const { unmount } = renderHook(() => useSubscriptionIap());
      await act(async () => {});

      // Act
      unmount();

      // Assert
      expect(iap.removePurchaseUpdate).toHaveBeenCalledTimes(1);
      expect(iap.removePurchaseError).toHaveBeenCalledTimes(1);
      expect(iap.module.endConnection).toHaveBeenCalledTimes(1);
    });
  });
});
