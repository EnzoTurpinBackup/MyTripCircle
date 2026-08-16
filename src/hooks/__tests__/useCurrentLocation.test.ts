import { renderHook, act } from "@testing-library/react-native";
import * as Location from "expo-location";
import { useCurrentLocation } from "../useCurrentLocation";

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const mockGetPermissions = Location.getForegroundPermissionsAsync as jest.Mock;
const mockGetPosition = Location.getCurrentPositionAsync as jest.Mock;

describe("useCurrentLocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return null before the position has been resolved", () => {
    // Arrange
    mockGetPermissions.mockResolvedValue({ status: "granted" });
    mockGetPosition.mockResolvedValue({ coords: { latitude: 1, longitude: 2 } });

    // Act
    const { result } = renderHook(() => useCurrentLocation());

    // Assert
    expect(result.current).toBeNull();
  });

  it("should return the current coordinates when the permission is granted", async () => {
    // Arrange
    mockGetPermissions.mockResolvedValue({ status: "granted" });
    mockGetPosition.mockResolvedValue({
      coords: { latitude: 48.8566, longitude: 2.3522 },
    });

    // Act
    const { result } = renderHook(() => useCurrentLocation());
    await act(async () => {});

    // Assert
    expect(result.current).toEqual({ lat: 48.8566, lng: 2.3522 });
  });

  it("should request the position with the balanced accuracy when the permission is granted", async () => {
    // Arrange
    mockGetPermissions.mockResolvedValue({ status: "granted" });
    mockGetPosition.mockResolvedValue({ coords: { latitude: 0, longitude: 0 } });

    // Act
    renderHook(() => useCurrentLocation());
    await act(async () => {});

    // Assert
    expect(mockGetPosition).toHaveBeenCalledWith({
      accuracy: Location.Accuracy.Balanced,
    });
  });

  it("should stay null and never read the position when the permission is denied", async () => {
    // Arrange
    mockGetPermissions.mockResolvedValue({ status: "denied" });

    // Act
    const { result } = renderHook(() => useCurrentLocation());
    await act(async () => {});

    // Assert
    expect(result.current).toBeNull();
    expect(mockGetPosition).not.toHaveBeenCalled();
  });
});
