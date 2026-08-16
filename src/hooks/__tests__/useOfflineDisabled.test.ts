import { renderHook } from "@testing-library/react-native";
import { useNetwork } from "../../contexts/NetworkContext";
import { OFFLINE_OPACITY, useOfflineDisabled } from "../useOfflineDisabled";

jest.mock("../../contexts/NetworkContext", () => ({
  useNetwork: jest.fn(),
}));

const mockUseNetwork = useNetwork as jest.Mock;

describe("useOfflineDisabled", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not disable and apply no style when the device is connected", () => {
    // Arrange
    mockUseNetwork.mockReturnValue({ isConnected: true });

    // Act
    const { result } = renderHook(() => useOfflineDisabled());

    // Assert
    expect(result.current.disabled).toBe(false);
    expect(result.current.style).toEqual({});
  });

  it("should disable and dim the element when the device is offline", () => {
    // Arrange
    mockUseNetwork.mockReturnValue({ isConnected: false });

    // Act
    const { result } = renderHook(() => useOfflineDisabled());

    // Assert
    expect(result.current.disabled).toBe(true);
    expect(result.current.style).toEqual({ opacity: OFFLINE_OPACITY });
  });
});
