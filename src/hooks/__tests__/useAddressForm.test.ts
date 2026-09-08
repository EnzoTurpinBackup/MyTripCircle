import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Address } from "../../types";
import { useTrips } from "../../contexts/TripsContext";
import {
  AddressSuggestion,
  getAddressSuggestions,
  getPlaceDetails,
} from "../../services/PlacesService";
import { useCurrentLocation } from "../useCurrentLocation";
import { ADDRESS_TYPES, getTypeIcon, useAddressForm } from "../useAddressForm";

jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../../contexts/TripsContext", () => ({
  useTrips: jest.fn(),
}));

jest.mock("../../services/PlacesService", () => ({
  __esModule: true,
  getAddressSuggestions: jest.fn(),
  getPlaceDetails: jest.fn(),
}));

jest.mock("../useCurrentLocation", () => ({
  useCurrentLocation: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.Mock;
const mockUseRoute = useRoute as jest.Mock;
const mockUseTrips = useTrips as jest.Mock;
const mockGetSuggestions = getAddressSuggestions as jest.Mock;
const mockGetPlaceDetails = getPlaceDetails as jest.Mock;
const mockUseCurrentLocation = useCurrentLocation as jest.Mock;

const DEBOUNCE_MS = 400;

const SUGGESTION: AddressSuggestion = {
  placeId: "place-1",
  description: "Hôtel Central, 1 rue de Paris, Paris, France",
};

const makeAddress = (overrides: Partial<Address> = {}): Address => ({
  id: "addr-1",
  type: "restaurant",
  name: "Chez Marcel",
  address: "1 rue de Paris",
  city: "Paris",
  country: "France",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

const goBack = jest.fn();
const createAddress = jest.fn();
const updateAddress = jest.fn();

type TripsState = {
  addresses?: Address[];
  loading?: boolean;
};

const useTripsState = ({ addresses = [], loading = false }: TripsState = {}) => {
  mockUseTrips.mockReturnValue({
    addresses,
    createAddress,
    updateAddress,
    loading,
  });
};

const setRouteParams = (params: Record<string, unknown> | undefined) => {
  mockUseRoute.mockReturnValue({ params });
};

/** Saisit une adresse puis laisse expirer le debounce de l'autocomplétion. */
const typeAddressAndFlush = async (
  result: { current: ReturnType<typeof useAddressForm> },
  value: string
) => {
  act(() => result.current.handleInputChange("address", value));
  await act(async () => {
    jest.advanceTimersByTime(DEBOUNCE_MS);
  });
};

const fillRequiredFields = (
  result: { current: ReturnType<typeof useAddressForm> },
  overrides: Partial<Record<"address" | "city" | "country", string>> = {}
) => {
  act(() =>
    result.current.handleInputChange("address", overrides.address ?? "1 rue de Paris")
  );
  act(() => result.current.handleInputChange("city", overrides.city ?? "Paris"));
  act(() =>
    result.current.handleInputChange("country", overrides.country ?? "France")
  );
};

describe("getTypeIcon", () => {
  it.each([
    ["hotel", "bed"],
    ["restaurant", "restaurant"],
    ["activity", "ticket"],
    ["transport", "car"],
    ["other", "location"],
  ] as [Address["type"], string][])(
    "should return the %s icon when the type is %s",
    (type, icon) => {
      // Arrange & Act
      const result = getTypeIcon(type);

      // Assert
      expect(result).toBe(icon);
    }
  );
});

describe("ADDRESS_TYPES", () => {
  it("should list every selectable address type in display order", () => {
    // Arrange & Act & Assert
    expect(ADDRESS_TYPES).toEqual([
      "hotel",
      "restaurant",
      "activity",
      "transport",
      "other",
    ]);
  });
});

describe("useAddressForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-20T10:00:00.000Z"));
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockUseNavigation.mockReturnValue({ goBack });
    setRouteParams({});
    useTripsState();
    mockUseCurrentLocation.mockReturnValue(null);
    mockGetSuggestions.mockResolvedValue([]);
    mockGetPlaceDetails.mockResolvedValue({});
    createAddress.mockResolvedValue(makeAddress());
    updateAddress.mockResolvedValue(makeAddress());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("initialisation", () => {
    it("should expose an empty form when creating a new address", () => {
      // Arrange & Act
      const { result } = renderHook(() => useAddressForm());

      // Assert
      expect(result.current.form).toEqual({
        type: "hotel",
        name: "",
        address: "",
        city: "",
        country: "",
        phone: "",
        website: "",
        notes: "",
      });
      expect(result.current.initialized).toBe(true);
      expect(result.current.existingAddress).toBeNull();
    });

    it("should use the creation title when no address is being edited", () => {
      // Arrange & Act
      const { result } = renderHook(() => useAddressForm());

      // Assert
      expect(result.current.screenTitle).toBe("addresses.form.title");
    });

    it("should use the edition title when an address is being edited", () => {
      // Arrange
      setRouteParams({ addressId: "addr-1" });
      useTripsState({ addresses: [makeAddress()] });

      // Act
      const { result } = renderHook(() => useAddressForm());

      // Assert
      expect(result.current.screenTitle).toBe("addresses.form.editTitle");
    });

    it("should fill the form from the edited address", () => {
      // Arrange
      setRouteParams({ addressId: "addr-1" });
      useTripsState({
        addresses: [
          makeAddress({
            phone: "01 02 03 04 05",
            website: "https://marcel.fr",
            notes: "Réserver tôt",
          }),
        ],
      });

      // Act
      const { result } = renderHook(() => useAddressForm());

      // Assert
      expect(result.current.form).toEqual({
        type: "restaurant",
        name: "Chez Marcel",
        address: "1 rue de Paris",
        city: "Paris",
        country: "France",
        phone: "01 02 03 04 05",
        website: "https://marcel.fr",
        notes: "Réserver tôt",
      });
    });

    it("should default the optional fields to empty strings when the address omits them", () => {
      // Arrange
      setRouteParams({ addressId: "addr-1" });
      useTripsState({ addresses: [makeAddress()] });

      // Act
      const { result } = renderHook(() => useAddressForm());

      // Assert
      expect(result.current.form.phone).toBe("");
      expect(result.current.form.website).toBe("");
      expect(result.current.form.notes).toBe("");
    });

    it("should expose the rating carried by the edited address", () => {
      // Arrange
      setRouteParams({ addressId: "addr-1" });
      useTripsState({ addresses: [makeAddress({ rating: 4.5 })] });

      // Act
      const { result } = renderHook(() => useAddressForm());

      // Assert
      expect(result.current.googleRating).toBe(4.5);
    });

    it("should expose no rating when the edited address has none", () => {
      // Arrange
      setRouteParams({ addressId: "addr-1" });
      useTripsState({ addresses: [makeAddress()] });

      // Act
      const { result } = renderHook(() => useAddressForm());

      // Assert
      expect(result.current.googleRating).toBeNull();
    });

    it("should expose no existing address when the requested id is unknown", () => {
      // Arrange
      setRouteParams({ addressId: "missing" });
      useTripsState({ addresses: [makeAddress()] });

      // Act
      const { result } = renderHook(() => useAddressForm());

      // Assert
      expect(result.current.existingAddress).toBeNull();
      expect(result.current.form.name).toBe("");
    });

    it("should expose no existing address when the route carries no parameter", () => {
      // Arrange
      setRouteParams(undefined);
      useTripsState({ addresses: [makeAddress()] });

      // Act
      const { result } = renderHook(() => useAddressForm());

      // Assert
      expect(result.current.addressId).toBeUndefined();
      expect(result.current.existingAddress).toBeNull();
    });

    it("should wait for the context to finish loading before initialising", () => {
      // Arrange
      setRouteParams({ addressId: "addr-1" });
      useTripsState({ addresses: [], loading: true });

      // Act
      const { result } = renderHook(() => useAddressForm());

      // Assert
      expect(result.current.initialized).toBe(false);
      expect(result.current.contextLoading).toBe(true);
    });

    it("should fill the form once the context has finished loading", () => {
      // Arrange
      setRouteParams({ addressId: "addr-1" });
      useTripsState({ addresses: [], loading: true });
      const { result, rerender } = renderHook(() => useAddressForm());

      // Act
      useTripsState({ addresses: [makeAddress()], loading: false });
      rerender({});

      // Assert
      expect(result.current.initialized).toBe(true);
      expect(result.current.form.name).toBe("Chez Marcel");
    });

    it("should not reinitialise the form once it has been initialised", () => {
      // Arrange
      setRouteParams({ addressId: "addr-1" });
      useTripsState({ addresses: [makeAddress()] });
      const { result, rerender } = renderHook(() => useAddressForm());
      act(() => result.current.handleInputChange("name", "Nom modifié"));

      // Act
      rerender({});

      // Assert
      expect(result.current.form.name).toBe("Nom modifié");
    });
  });

  describe("handleInputChange", () => {
    it("should update only the edited field", () => {
      // Arrange
      const { result } = renderHook(() => useAddressForm());

      // Act
      act(() => result.current.handleInputChange("city", "Lyon"));

      // Assert
      expect(result.current.form.city).toBe("Lyon");
      expect(result.current.form.country).toBe("");
    });

    it("should group the phone number in pairs of digits", () => {
      // Arrange
      const { result } = renderHook(() => useAddressForm());

      // Act
      act(() => result.current.handleInputChange("phone", "0612345678"));

      // Assert
      expect(result.current.form.phone).toBe("06 12 34 56 78");
    });

    it("should strip every non-digit character from the phone number", () => {
      // Arrange
      const { result } = renderHook(() => useAddressForm());

      // Act
      act(() => result.current.handleInputChange("phone", "+33 (6) 12-34.56/78"));

      // Assert
      expect(result.current.form.phone).toBe("33 61 23 45 67");
    });

    it("should keep at most ten digits in the phone number", () => {
      // Arrange
      const { result } = renderHook(() => useAddressForm());

      // Act
      act(() => result.current.handleInputChange("phone", "06123456789012"));

      // Assert
      expect(result.current.form.phone).toBe("06 12 34 56 78");
    });
  });

  describe("autocomplétion de l'adresse", () => {
    it("should not search when the address is shorter than three characters", async () => {
      // Arrange
      const { result } = renderHook(() => useAddressForm());

      // Act
      await typeAddressAndFlush(result, "ru");

      // Assert
      expect(mockGetSuggestions).not.toHaveBeenCalled();
      expect(result.current.suggestions).toEqual([]);
    });

    it("should not search before the debounce delay has elapsed", async () => {
      // Arrange
      const { result } = renderHook(() => useAddressForm());

      // Act
      act(() => result.current.handleInputChange("address", "rue de Paris"));
      await act(async () => {
        jest.advanceTimersByTime(DEBOUNCE_MS - 1);
      });

      // Assert
      expect(mockGetSuggestions).not.toHaveBeenCalled();
    });

    it("should search the trimmed address with the selected type", async () => {
      // Arrange
      const { result } = renderHook(() => useAddressForm());

      // Act
      await typeAddressAndFlush(result, "  rue de Paris  ");

      // Assert
      expect(mockGetSuggestions).toHaveBeenCalledWith(
        "rue de Paris",
        expect.any(AbortSignal),
        undefined,
        "hotel"
      );
    });

    it("should bias the search with the current location when it is known", async () => {
      // Arrange
      mockUseCurrentLocation.mockReturnValue({ lat: 48.85, lng: 2.35 });
      const { result } = renderHook(() => useAddressForm());

      // Act
      await typeAddressAndFlush(result, "rue de Paris");

      // Assert
      expect(mockGetSuggestions).toHaveBeenCalledWith(
        "rue de Paris",
        expect.any(AbortSignal),
        { lat: 48.85, lng: 2.35 },
        "hotel"
      );
    });

    it("should search again when the address type changes", async () => {
      // Arrange
      const { result } = renderHook(() => useAddressForm());
      await typeAddressAndFlush(result, "rue de Paris");

      // Act
      act(() => result.current.handleInputChange("type", "restaurant"));
      await act(async () => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });

      // Assert
      expect(mockGetSuggestions).toHaveBeenCalledTimes(2);
      expect(mockGetSuggestions).toHaveBeenLastCalledWith(
        "rue de Paris",
        expect.any(AbortSignal),
        undefined,
        "restaurant"
      );
    });

    it("should expose the suggestions returned by the search", async () => {
      // Arrange
      mockGetSuggestions.mockResolvedValue([SUGGESTION]);
      const { result } = renderHook(() => useAddressForm());

      // Act
      await typeAddressAndFlush(result, "rue de Paris");

      // Assert
      expect(result.current.suggestions).toEqual([SUGGESTION]);
      expect(result.current.loadingSuggestions).toBe(false);
    });

    it("should report the search as loading while it is in flight", async () => {
      // Arrange
      let resolveSearch!: (value: AddressSuggestion[]) => void;
      mockGetSuggestions.mockReturnValue(
        new Promise<AddressSuggestion[]>((resolve) => {
          resolveSearch = resolve;
        })
      );
      const { result } = renderHook(() => useAddressForm());

      // Act
      await typeAddressAndFlush(result, "rue de Paris");

      // Assert
      expect(result.current.loadingSuggestions).toBe(true);
      await act(async () => {
        resolveSearch([SUGGESTION]);
      });
      expect(result.current.loadingSuggestions).toBe(false);
    });

    it("should drop the suggestions when the address falls back under three characters", async () => {
      // Arrange
      mockGetSuggestions.mockResolvedValue([SUGGESTION]);
      const { result } = renderHook(() => useAddressForm());
      await typeAddressAndFlush(result, "rue de Paris");

      // Act
      act(() => result.current.handleInputChange("address", "ru"));

      // Assert
      expect(result.current.suggestions).toEqual([]);
    });

    it("should cancel the pending search when the address changes again", async () => {
      // Arrange
      const { result } = renderHook(() => useAddressForm());

      // Act
      act(() => result.current.handleInputChange("address", "rue de Par"));
      act(() => result.current.handleInputChange("address", "rue de Paris"));
      await act(async () => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });

      // Assert
      expect(mockGetSuggestions).toHaveBeenCalledTimes(1);
      expect(mockGetSuggestions).toHaveBeenLastCalledWith(
        "rue de Paris",
        expect.any(AbortSignal),
        undefined,
        "hotel"
      );
    });

    it("should log the failure when the search rejects", async () => {
      // Arrange
      const failure = new Error("network down");
      mockGetSuggestions.mockRejectedValue(failure);
      const { result } = renderHook(() => useAddressForm());

      // Act
      await typeAddressAndFlush(result, "rue de Paris");

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        "Address suggestions error:",
        failure
      );
    });

    it("should stay silent when the search is aborted", async () => {
      // Arrange
      const abort = new Error("aborted");
      abort.name = "AbortError";
      mockGetSuggestions.mockRejectedValue(abort);
      const { result } = renderHook(() => useAddressForm());

      // Act
      await typeAddressAndFlush(result, "rue de Paris");

      // Assert
      expect(console.error).not.toHaveBeenCalled();
    });

    it("should discard suggestions that arrive after the hook unmounted", async () => {
      // Arrange
      let resolveSearch!: (value: AddressSuggestion[]) => void;
      mockGetSuggestions.mockReturnValue(
        new Promise<AddressSuggestion[]>((resolve) => {
          resolveSearch = resolve;
        })
      );
      const { result, unmount } = renderHook(() => useAddressForm());
      await typeAddressAndFlush(result, "rue de Paris");

      // Act
      unmount();
      await act(async () => {
        resolveSearch([SUGGESTION]);
      });

      // Assert
      expect(result.current.suggestions).toEqual([]);
    });
  });

  describe("handleSuggestionPress", () => {
    it("should fill the form with the place details", async () => {
      // Arrange
      mockGetPlaceDetails.mockResolvedValue({
        name: "Hôtel Central",
        formattedAddress: "1 rue de Paris, 75001 Paris",
        city: "Paris",
        country: "France",
        phone: "01 02 03 04 05",
        website: "https://central.fr",
      });
      const { result } = renderHook(() => useAddressForm());

      // Act
      await act(async () => {
        await result.current.handleSuggestionPress(SUGGESTION);
      });

      // Assert
      expect(mockGetPlaceDetails).toHaveBeenCalledWith("place-1");
      expect(result.current.form).toMatchObject({
        name: "Hôtel Central",
        address: "1 rue de Paris, 75001 Paris",
        city: "Paris",
        country: "France",
        phone: "01 02 03 04 05",
        website: "https://central.fr",
      });
    });

    it("should fall back to the first part of the description when details have no name", async () => {
      // Arrange
      mockGetPlaceDetails.mockResolvedValue({});
      const { result } = renderHook(() => useAddressForm());

      // Act
      await act(async () => {
        await result.current.handleSuggestionPress(SUGGESTION);
      });

      // Assert
      expect(result.current.form.name).toBe("Hôtel Central");
      expect(result.current.form.address).toBe(SUGGESTION.description);
    });

    it("should keep the already typed fields when the details omit them", async () => {
      // Arrange
      mockGetPlaceDetails.mockResolvedValue({});
      const { result } = renderHook(() => useAddressForm());
      act(() => result.current.handleInputChange("city", "Lyon"));
      act(() => result.current.handleInputChange("country", "France"));
      act(() => result.current.handleInputChange("phone", "0102030405"));
      act(() => result.current.handleInputChange("website", "https://a.fr"));

      // Act
      await act(async () => {
        await result.current.handleSuggestionPress(SUGGESTION);
      });

      // Assert
      expect(result.current.form).toMatchObject({
        city: "Lyon",
        country: "France",
        phone: "01 02 03 04 05",
        website: "https://a.fr",
      });
    });

    it("should store the rating returned by the details", async () => {
      // Arrange
      mockGetPlaceDetails.mockResolvedValue({ rating: 4.7 });
      const { result } = renderHook(() => useAddressForm());

      // Act
      await act(async () => {
        await result.current.handleSuggestionPress(SUGGESTION);
      });

      // Assert
      expect(result.current.googleRating).toBe(4.7);
    });

    it("should keep the previous rating when the details carry none", async () => {
      // Arrange
      setRouteParams({ addressId: "addr-1" });
      useTripsState({ addresses: [makeAddress({ rating: 3.1 })] });
      mockGetPlaceDetails.mockResolvedValue({});
      const { result } = renderHook(() => useAddressForm());

      // Act
      await act(async () => {
        await result.current.handleSuggestionPress(SUGGESTION);
      });

      // Assert
      expect(result.current.googleRating).toBe(3.1);
    });

    it("should clear the suggestion list once a suggestion is picked", async () => {
      // Arrange
      mockGetSuggestions.mockResolvedValue([SUGGESTION]);
      const { result } = renderHook(() => useAddressForm());
      await typeAddressAndFlush(result, "rue de Paris");

      // Act
      await act(async () => {
        await result.current.handleSuggestionPress(SUGGESTION);
      });

      // Assert
      expect(result.current.suggestions).toEqual([]);
    });

    it("should report the details request as in flight until it settles", async () => {
      // Arrange
      let resolveDetails!: (value: Record<string, unknown>) => void;
      mockGetPlaceDetails.mockReturnValue(
        new Promise((resolve) => {
          resolveDetails = resolve;
        })
      );
      const { result } = renderHook(() => useAddressForm());

      // Act
      act(() => {
        void result.current.handleSuggestionPress(SUGGESTION);
      });

      // Assert
      expect(result.current.fetchingPlaceDetails).toBe(true);
      await act(async () => {
        resolveDetails({});
      });
      expect(result.current.fetchingPlaceDetails).toBe(false);
    });

    it("should log the failure and stop loading when the details request rejects", async () => {
      // Arrange
      const failure = new Error("details unavailable");
      mockGetPlaceDetails.mockRejectedValue(failure);
      const { result } = renderHook(() => useAddressForm());

      // Act
      await act(async () => {
        await result.current.handleSuggestionPress(SUGGESTION);
      });

      // Assert
      expect(console.error).toHaveBeenCalledWith("Place details error:", failure);
      expect(result.current.fetchingPlaceDetails).toBe(false);
    });
  });

  describe("handleSubmit", () => {
    it("should refuse to submit when the address is blank", async () => {
      // Arrange
      const { result } = renderHook(() => useAddressForm());
      fillRequiredFields(result, { address: "   " });

      // Act
      await act(async () => {
        await result.current.handleSubmit();
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "common.error",
        "addresses.form.requiredFields"
      );
      expect(createAddress).not.toHaveBeenCalled();
    });

    it("should refuse to submit when the city is blank", async () => {
      // Arrange
      const { result } = renderHook(() => useAddressForm());
      fillRequiredFields(result, { city: "  " });

      // Act
      await act(async () => {
        await result.current.handleSubmit();
      });

      // Assert
      expect(createAddress).not.toHaveBeenCalled();
    });

    it("should refuse to submit when the country is blank", async () => {
      // Arrange
      const { result } = renderHook(() => useAddressForm());
      fillRequiredFields(result, { country: "" });

      // Act
      await act(async () => {
        await result.current.handleSubmit();
      });

      // Assert
      expect(createAddress).not.toHaveBeenCalled();
    });

    it("should create the address attached to the current trip", async () => {
      // Arrange
      setRouteParams({ tripId: "trip-9" });
      const { result } = renderHook(() => useAddressForm());
      fillRequiredFields(result, { address: "  1 rue de Paris  " });
      act(() => result.current.handleInputChange("name", "  Hôtel Central  "));

      // Act
      await act(async () => {
        await result.current.handleSubmit();
      });

      // Assert
      expect(createAddress).toHaveBeenCalledWith({
        type: "hotel",
        name: "Hôtel Central",
        address: "1 rue de Paris",
        city: "Paris",
        country: "France",
        phone: undefined,
        website: undefined,
        notes: undefined,
        rating: undefined,
        tripId: "trip-9",
      });
    });

    it("should include the optional fields when they are filled", async () => {
      // Arrange
      const { result } = renderHook(() => useAddressForm());
      fillRequiredFields(result);
      act(() => result.current.handleInputChange("phone", "0102030405"));
      act(() => result.current.handleInputChange("website", "https://central.fr"));
      act(() => result.current.handleInputChange("notes", "Réserver tôt"));

      // Act
      await act(async () => {
        await result.current.handleSubmit();
      });

      // Assert
      expect(createAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "01 02 03 04 05",
          website: "https://central.fr",
          notes: "Réserver tôt",
        })
      );
    });

    it("should update the existing address instead of creating one", async () => {
      // Arrange
      setRouteParams({ addressId: "addr-1" });
      useTripsState({ addresses: [makeAddress({ rating: 4.5 })] });
      const { result } = renderHook(() => useAddressForm());

      // Act
      await act(async () => {
        await result.current.handleSubmit();
      });

      // Assert
      expect(updateAddress).toHaveBeenCalledWith(
        "addr-1",
        expect.objectContaining({
          type: "restaurant",
          name: "Chez Marcel",
          rating: 4.5,
        })
      );
      expect(createAddress).not.toHaveBeenCalled();
    });

    it("should go back to the previous screen once the submit succeeds", async () => {
      // Arrange
      const { result } = renderHook(() => useAddressForm());
      fillRequiredFields(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit();
      });

      // Assert
      expect(goBack).toHaveBeenCalledTimes(1);
    });

    it("should report the submit as in progress until it settles", async () => {
      // Arrange
      let resolveCreate!: (value: Address) => void;
      createAddress.mockReturnValue(
        new Promise<Address>((resolve) => {
          resolveCreate = resolve;
        })
      );
      const { result } = renderHook(() => useAddressForm());
      fillRequiredFields(result);

      // Act
      act(() => {
        void result.current.handleSubmit();
      });

      // Assert
      expect(result.current.submitting).toBe(true);
      await act(async () => {
        resolveCreate(makeAddress());
      });
      expect(result.current.submitting).toBe(false);
    });

    it("should stay on the screen and report the failure when the submit rejects", async () => {
      // Arrange
      const failure = new Error("save failed");
      createAddress.mockRejectedValue(failure);
      const { result } = renderHook(() => useAddressForm());
      fillRequiredFields(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit();
      });

      // Assert
      expect(console.error).toHaveBeenCalledWith("Address submit error:", failure);
      expect(Alert.alert).toHaveBeenCalledWith(
        "common.error",
        "addresses.form.submitError"
      );
      expect(goBack).not.toHaveBeenCalled();
      expect(result.current.submitting).toBe(false);
    });
  });
});
