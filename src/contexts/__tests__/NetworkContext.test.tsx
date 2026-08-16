import React, { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react-native";
import { AppState, AppStateStatus } from "react-native";
import { NetworkProvider, useNetwork } from "../NetworkContext";
import { API_BASE_URL } from "../../config/api";

const CHECK_INTERVAL_MS = 8000;
const TIMEOUT_MS = 5000;

const wrapper = ({ children }: { children: ReactNode }) => (
  <NetworkProvider>{children}</NetworkProvider>
);

describe("NetworkContext", () => {
  let mockFetch: jest.Mock;
  let removeListener: jest.Mock;
  let emitAppState: (state: AppStateStatus) => void;

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch as unknown as typeof fetch;

    removeListener = jest.fn();
    emitAppState = () => {};
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event: string, handler: (state: AppStateStatus) => void) => {
        emitAppState = handler;
        return { remove: removeListener } as never;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const renderNetwork = async () => {
    const rendered = renderHook(() => useNetwork(), { wrapper });
    await act(async () => {});
    return rendered;
  };

  describe("sonde de disponibilité", () => {
    it("should report the network as connected when the health probe succeeds", async () => {
      // Arrange
      mockFetch.mockResolvedValue({ ok: true });

      // Act
      const { result } = await renderNetwork();

      // Assert
      expect(result.current.isConnected).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/health`,
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should report the network as disconnected when the health probe answers with a non-ok status", async () => {
      // Arrange
      mockFetch.mockResolvedValue({ ok: false });

      // Act
      const { result } = await renderNetwork();

      // Assert
      expect(result.current.isConnected).toBe(false);
    });

    it("should report the network as disconnected when the health probe rejects", async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error("Network request failed"));

      // Act
      const { result } = await renderNetwork();

      // Assert
      expect(result.current.isConnected).toBe(false);
    });

    it("should abort the probe when the request exceeds the timeout", async () => {
      // Arrange
      let capturedSignal: AbortSignal | undefined;
      mockFetch.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
        capturedSignal = options.signal;
        return new Promise(() => {});
      });
      await renderNetwork();

      // Act
      act(() => {
        jest.advanceTimersByTime(TIMEOUT_MS);
      });

      // Assert
      expect(capturedSignal?.aborted).toBe(true);
    });
  });

  describe("scrutation périodique", () => {
    it("should probe again after each polling interval", async () => {
      // Arrange
      await renderNetwork();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Act
      await act(async () => {
        jest.advanceTimersByTime(CHECK_INTERVAL_MS);
      });

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should update the connectivity when a later probe fails", async () => {
      // Arrange
      const { result } = await renderNetwork();
      mockFetch.mockRejectedValue(new Error("offline"));

      // Act
      await act(async () => {
        jest.advanceTimersByTime(CHECK_INTERVAL_MS);
      });

      // Assert
      expect(result.current.isConnected).toBe(false);
    });

    it("should stop probing after unmount", async () => {
      // Arrange
      const { unmount } = await renderNetwork();

      // Act
      unmount();
      await act(async () => {
        jest.advanceTimersByTime(CHECK_INTERVAL_MS * 3);
      });

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should remove the app state listener on unmount", async () => {
      // Arrange
      const { unmount } = await renderNetwork();

      // Act
      unmount();

      // Assert
      expect(removeListener).toHaveBeenCalledTimes(1);
    });
  });

  describe("cycle de vie de l'application", () => {
    it("should probe immediately when the app becomes active", async () => {
      // Arrange
      await renderNetwork();

      // Act
      await act(async () => {
        emitAppState("active");
      });

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should stop probing when the app goes to the background", async () => {
      // Arrange
      await renderNetwork();

      // Act
      await act(async () => {
        emitAppState("background");
      });
      await act(async () => {
        jest.advanceTimersByTime(CHECK_INTERVAL_MS * 2);
      });

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should resume periodic probing after coming back from the background", async () => {
      // Arrange
      await renderNetwork();
      await act(async () => {
        emitAppState("background");
      });

      // Act
      await act(async () => {
        emitAppState("active");
      });
      await act(async () => {
        jest.advanceTimersByTime(CHECK_INTERVAL_MS);
      });

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("valeur par défaut du contexte", () => {
    it("should assume the network is connected when used outside of a provider", () => {
      // Arrange & Act
      const { result } = renderHook(() => useNetwork());

      // Assert
      expect(result.current.isConnected).toBe(true);
    });
  });
});
