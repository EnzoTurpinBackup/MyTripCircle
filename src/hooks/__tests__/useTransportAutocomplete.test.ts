import { renderHook, act } from "@testing-library/react-native";
import {
  getAddressSuggestions,
  type AddressSuggestion,
} from "../../services/PlacesService";
import useTransportAutocomplete from "../useTransportAutocomplete";

jest.mock("../../services/PlacesService", () => ({
  __esModule: true,
  getAddressSuggestions: jest.fn(),
}));

const mockGetSuggestions = getAddressSuggestions as jest.Mock;

const SUGGESTIONS: AddressSuggestion[] = [
  { placeId: "cdg", description: "Paris Charles de Gaulle (CDG)" },
  { placeId: "ory", description: "Paris Orly (ORY)" },
];

describe("useTransportAutocomplete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSuggestions.mockResolvedValue([]);
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should start with both suggestion lists empty and hidden", () => {
    // Arrange & Act
    const { result } = renderHook(() => useTransportAutocomplete());

    // Assert
    expect(result.current.originSuggestions).toEqual([]);
    expect(result.current.showOriginSuggestions).toBe(false);
    expect(result.current.destinationSuggestions).toEqual([]);
    expect(result.current.showDestinationSuggestions).toBe(false);
  });

  it("should forward the typed text to the caller when the origin changes", async () => {
    // Arrange
    const onTextChange = jest.fn();
    const { result } = renderHook(() => useTransportAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleOriginChange("Paris", onTextChange, "flight");
    });

    // Assert
    expect(onTextChange).toHaveBeenCalledWith("Paris");
  });

  it("should search airports when the transport type is a flight", async () => {
    // Arrange
    const { result } = renderHook(() => useTransportAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleOriginChange("  Paris  ", jest.fn(), "flight");
    });

    // Assert
    expect(mockGetSuggestions).toHaveBeenCalledWith(
      "Paris",
      undefined,
      undefined,
      "airport"
    );
  });

  it("should search train stations when the transport type is a train", async () => {
    // Arrange
    const { result } = renderHook(() => useTransportAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleOriginChange("Lyon", jest.fn(), "train");
    });

    // Assert
    expect(mockGetSuggestions).toHaveBeenCalledWith(
      "Lyon",
      undefined,
      undefined,
      "train_station"
    );
  });

  it("should display the origin suggestions when the search returns results", async () => {
    // Arrange
    mockGetSuggestions.mockResolvedValue(SUGGESTIONS);
    const { result } = renderHook(() => useTransportAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleOriginChange("Paris", jest.fn(), "flight");
    });

    // Assert
    expect(result.current.originSuggestions).toEqual(SUGGESTIONS);
    expect(result.current.showOriginSuggestions).toBe(true);
  });

  it("should keep the origin list hidden when the search returns nothing", async () => {
    // Arrange
    mockGetSuggestions.mockResolvedValue([]);
    const { result } = renderHook(() => useTransportAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleOriginChange("zzzz", jest.fn(), "flight");
    });

    // Assert
    expect(result.current.originSuggestions).toEqual([]);
    expect(result.current.showOriginSuggestions).toBe(false);
  });

  it("should reset the origin without searching when the text is blank", async () => {
    // Arrange
    mockGetSuggestions.mockResolvedValue(SUGGESTIONS);
    const { result } = renderHook(() => useTransportAutocomplete());
    await act(async () => {
      await result.current.handleOriginChange("Paris", jest.fn(), "flight");
    });
    mockGetSuggestions.mockClear();

    // Act
    await act(async () => {
      await result.current.handleOriginChange("   ", jest.fn(), "flight");
    });

    // Assert
    expect(result.current.originSuggestions).toEqual([]);
    expect(result.current.showOriginSuggestions).toBe(false);
    expect(mockGetSuggestions).not.toHaveBeenCalled();
  });

  it("should reset the origin and warn when the search fails", async () => {
    // Arrange
    const failure = new Error("network down");
    mockGetSuggestions.mockRejectedValue(failure);
    const { result } = renderHook(() => useTransportAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleOriginChange("Paris", jest.fn(), "flight");
    });

    // Assert
    expect(result.current.originSuggestions).toEqual([]);
    expect(result.current.showOriginSuggestions).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(
      "[useTransportAutocomplete] Erreur autocomplétion transport:",
      failure
    );
  });

  it("should display the destination suggestions when the search returns results", async () => {
    // Arrange
    mockGetSuggestions.mockResolvedValue(SUGGESTIONS);
    const { result } = renderHook(() => useTransportAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleDestinationChange("Paris", jest.fn(), "train");
    });

    // Assert
    expect(result.current.destinationSuggestions).toEqual(SUGGESTIONS);
    expect(result.current.showDestinationSuggestions).toBe(true);
  });

  it("should leave the origin untouched when only the destination changes", async () => {
    // Arrange
    mockGetSuggestions.mockResolvedValue(SUGGESTIONS);
    const { result } = renderHook(() => useTransportAutocomplete());

    // Act
    await act(async () => {
      await result.current.handleDestinationChange("Paris", jest.fn(), "train");
    });

    // Assert
    expect(result.current.originSuggestions).toEqual([]);
    expect(result.current.showOriginSuggestions).toBe(false);
  });

  it("should reset the destination without searching when the text is blank", async () => {
    // Arrange
    mockGetSuggestions.mockResolvedValue(SUGGESTIONS);
    const { result } = renderHook(() => useTransportAutocomplete());
    await act(async () => {
      await result.current.handleDestinationChange("Paris", jest.fn(), "train");
    });
    mockGetSuggestions.mockClear();

    // Act
    await act(async () => {
      await result.current.handleDestinationChange("", jest.fn(), "train");
    });

    // Assert
    expect(result.current.destinationSuggestions).toEqual([]);
    expect(result.current.showDestinationSuggestions).toBe(false);
    expect(mockGetSuggestions).not.toHaveBeenCalled();
  });

  it("should report the chosen description and clear the origin list on selection", async () => {
    // Arrange
    mockGetSuggestions.mockResolvedValue(SUGGESTIONS);
    const onSelect = jest.fn();
    const { result } = renderHook(() => useTransportAutocomplete());
    await act(async () => {
      await result.current.handleOriginChange("Paris", jest.fn(), "flight");
    });

    // Act
    act(() => result.current.handleSelectOrigin(SUGGESTIONS[0], onSelect));

    // Assert
    expect(onSelect).toHaveBeenCalledWith("Paris Charles de Gaulle (CDG)");
    expect(result.current.originSuggestions).toEqual([]);
    expect(result.current.showOriginSuggestions).toBe(false);
  });

  it("should report the chosen description and clear the destination list on selection", async () => {
    // Arrange
    mockGetSuggestions.mockResolvedValue(SUGGESTIONS);
    const onSelect = jest.fn();
    const { result } = renderHook(() => useTransportAutocomplete());
    await act(async () => {
      await result.current.handleDestinationChange("Paris", jest.fn(), "flight");
    });

    // Act
    act(() => result.current.handleSelectDestination(SUGGESTIONS[1], onSelect));

    // Assert
    expect(onSelect).toHaveBeenCalledWith("Paris Orly (ORY)");
    expect(result.current.destinationSuggestions).toEqual([]);
    expect(result.current.showDestinationSuggestions).toBe(false);
  });
});
