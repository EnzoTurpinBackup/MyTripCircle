import { renderHook, act } from "@testing-library/react-native";
import * as PlacesService from "../../services/PlacesService";
import { useCurrentLocation } from "../useCurrentLocation";
import useAddressAutocomplete from "../useAddressAutocomplete";

jest.mock("../../services/PlacesService", () => ({
  __esModule: true,
  getAddressSuggestions: jest.fn(),
  hasGooglePlacesApiKey: true,
}));

jest.mock("../useCurrentLocation", () => ({
  useCurrentLocation: jest.fn(),
}));

const mockGetSuggestions = PlacesService.getAddressSuggestions as jest.Mock;
const mockUseCurrentLocation = useCurrentLocation as jest.Mock;

const setApiKeyAvailability = (available: boolean) => {
  (PlacesService as { hasGooglePlacesApiKey: boolean }).hasGooglePlacesApiKey =
    available;
};

const SUGGESTIONS: PlacesService.AddressSuggestion[] = [
  { placeId: "p1", description: "1 rue de Paris, Paris, France" },
  { placeId: "p2", description: "2 rue de Paris, Paris, France" },
];

describe("useAddressAutocomplete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setApiKeyAvailability(true);
    mockUseCurrentLocation.mockReturnValue(null);
    mockGetSuggestions.mockResolvedValue([]);
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should start with no suggestion displayed", () => {
    // Arrange & Act
    const { result } = renderHook(() => useAddressAutocomplete());

    // Assert
    expect(result.current.addressSuggestions).toEqual([]);
    expect(result.current.showAddressSuggestions).toBe(false);
  });

  it("should forward the typed text to the caller when the address changes", async () => {
    // Arrange
    const onTextChange = jest.fn();
    const { result } = renderHook(() => useAddressAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleAddressChange("rue de Paris", onTextChange);
    });

    // Assert
    expect(onTextChange).toHaveBeenCalledWith("rue de Paris");
  });

  it("should expose the returned suggestions when the search succeeds", async () => {
    // Arrange
    mockGetSuggestions.mockResolvedValue(SUGGESTIONS);
    const { result } = renderHook(() => useAddressAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleAddressChange("rue de Paris", jest.fn());
    });

    // Assert
    expect(result.current.addressSuggestions).toEqual(SUGGESTIONS);
    expect(result.current.showAddressSuggestions).toBe(true);
  });

  it("should keep the suggestion list hidden when the search returns nothing", async () => {
    // Arrange
    mockGetSuggestions.mockResolvedValue([]);
    const { result } = renderHook(() => useAddressAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleAddressChange("zzzz", jest.fn());
    });

    // Assert
    expect(result.current.addressSuggestions).toEqual([]);
    expect(result.current.showAddressSuggestions).toBe(false);
  });

  it("should search with the trimmed text and no location when none is known", async () => {
    // Arrange
    const { result } = renderHook(() => useAddressAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleAddressChange("  Paris  ", jest.fn());
    });

    // Assert
    expect(mockGetSuggestions).toHaveBeenCalledWith(
      "Paris",
      expect.any(AbortSignal),
      undefined
    );
  });

  it("should bias the search with the current location when it is known", async () => {
    // Arrange
    mockUseCurrentLocation.mockReturnValue({ lat: 48.85, lng: 2.35 });
    const { result } = renderHook(() => useAddressAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleAddressChange("Paris", jest.fn());
    });

    // Assert
    expect(mockGetSuggestions).toHaveBeenCalledWith(
      "Paris",
      expect.any(AbortSignal),
      { lat: 48.85, lng: 2.35 }
    );
  });

  it("should clear the suggestions without searching when the text is blank", async () => {
    // Arrange
    mockGetSuggestions.mockResolvedValue(SUGGESTIONS);
    const { result } = renderHook(() => useAddressAutocomplete());
    await act(async () => {
      await result.current.handleAddressChange("Paris", jest.fn());
    });
    mockGetSuggestions.mockClear();

    // Act
    await act(async () => {
      await result.current.handleAddressChange("   ", jest.fn());
    });

    // Assert
    expect(result.current.addressSuggestions).toEqual([]);
    expect(result.current.showAddressSuggestions).toBe(false);
    expect(mockGetSuggestions).not.toHaveBeenCalled();
  });

  it("should not search when the Places API key is unavailable", async () => {
    // Arrange
    setApiKeyAvailability(false);
    const { result } = renderHook(() => useAddressAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleAddressChange("Paris", jest.fn());
    });

    // Assert
    expect(mockGetSuggestions).not.toHaveBeenCalled();
    expect(result.current.showAddressSuggestions).toBe(false);
  });

  it("should log the failure when the suggestion request rejects", async () => {
    // Arrange
    const failure = new Error("network down");
    mockGetSuggestions.mockRejectedValue(failure);
    const { result } = renderHook(() => useAddressAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleAddressChange("Paris", jest.fn());
    });

    // Assert
    expect(console.error).toHaveBeenCalledWith(
      "Address suggestions error:",
      failure
    );
  });

  it("should stay silent when the suggestion request is aborted", async () => {
    // Arrange
    const abort = new Error("aborted");
    abort.name = "AbortError";
    mockGetSuggestions.mockRejectedValue(abort);
    const { result } = renderHook(() => useAddressAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleAddressChange("Paris", jest.fn());
    });

    // Assert
    expect(console.error).not.toHaveBeenCalled();
  });

  it("should report the chosen description and hide the list when a suggestion is selected", async () => {
    // Arrange
    mockGetSuggestions.mockResolvedValue(SUGGESTIONS);
    const onSelect = jest.fn();
    const { result } = renderHook(() => useAddressAutocomplete());
    await act(async () => {
      await result.current.handleAddressChange("rue", jest.fn());
    });

    // Act
    act(() => result.current.handleSelectAddress(SUGGESTIONS[0], onSelect));

    // Assert
    expect(onSelect).toHaveBeenCalledWith("1 rue de Paris, Paris, France");
    expect(result.current.addressSuggestions).toEqual([]);
    expect(result.current.showAddressSuggestions).toBe(false);
  });
});
