import { renderHook, act } from "@testing-library/react-native";
import { Alert, Animated } from "react-native";
import { Address } from "../../types";
import {
  AddressSuggestion,
  getAddressSuggestions,
  getPlaceDetails,
} from "../../services/PlacesService";
import { useCurrentLocation } from "../useCurrentLocation";
import { useAddressFormModal } from "../useAddressFormModal";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../../services/PlacesService", () => ({
  __esModule: true,
  getAddressSuggestions: jest.fn(),
  getPlaceDetails: jest.fn(),
}));

jest.mock("../useCurrentLocation", () => ({
  useCurrentLocation: jest.fn(),
}));

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

type Props = {
  visible: boolean;
  initialAddress?: Address;
  onSave: (address: Omit<Address, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onClose: () => void;
};

const setup = (overrides: Partial<Props> = {}) => {
  const onSave = jest.fn().mockResolvedValue(undefined);
  const onClose = jest.fn();
  const initialProps: Props = { visible: true, onSave, onClose, ...overrides };
  const rendered = renderHook((props: Props) => useAddressFormModal(props), {
    initialProps,
  });
  return { ...rendered, onSave, onClose, initialProps };
};

/** Saisit une adresse puis laisse expirer le debounce de l'autocomplétion. */
const typeAddressAndFlush = async (
  result: { current: ReturnType<typeof useAddressFormModal> },
  value: string
) => {
  act(() => result.current.handleInputChange("address", value));
  await act(async () => {
    jest.advanceTimersByTime(DEBOUNCE_MS);
  });
};

describe("useAddressFormModal", () => {
  let springSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-20T10:00:00.000Z"));
    springSpy = jest
      .spyOn(Animated, "spring")
      .mockReturnValue({ start: jest.fn() } as unknown as Animated.CompositeAnimation);
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockUseCurrentLocation.mockReturnValue(null);
    mockGetSuggestions.mockResolvedValue([]);
    mockGetPlaceDetails.mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("initialisation", () => {
    it("should expose an empty form when opened without an initial address", () => {
      // Arrange & Act
      const { result } = setup();

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
      expect(result.current.googleRating).toBeNull();
    });

    it("should fill the form from the initial address when opened for editing", () => {
      // Arrange
      const initialAddress = makeAddress({
        phone: "01 02 03 04 05",
        website: "https://marcel.fr",
        notes: "Réserver tôt",
      });

      // Act
      const { result } = setup({ initialAddress });

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
      // Arrange & Act
      const { result } = setup({ initialAddress: makeAddress() });

      // Assert
      expect(result.current.form.phone).toBe("");
      expect(result.current.form.website).toBe("");
      expect(result.current.form.notes).toBe("");
    });

    it("should expose the rating carried by the initial address", () => {
      // Arrange & Act
      const { result } = setup({
        initialAddress: makeAddress({ rating: 4.5 }),
      });

      // Assert
      expect(result.current.googleRating).toBe(4.5);
    });

    it("should expose no rating when the initial address has none", () => {
      // Arrange & Act
      const { result } = setup({ initialAddress: makeAddress() });

      // Assert
      expect(result.current.googleRating).toBeNull();
    });

    it("should keep the form untouched while the modal is hidden", () => {
      // Arrange & Act
      const { result } = setup({
        visible: false,
        initialAddress: makeAddress(),
      });

      // Assert
      expect(result.current.form.name).toBe("");
    });

    it("should reset the form when reopened without an initial address", () => {
      // Arrange
      const { result, rerender, initialProps } = setup({
        initialAddress: makeAddress({ rating: 4.2, photoUrl: "http://p.jpg" }),
      });

      // Act
      rerender({ ...initialProps, visible: false });
      rerender({ ...initialProps, visible: true, initialAddress: undefined });

      // Assert
      expect(result.current.form.name).toBe("");
      expect(result.current.form.type).toBe("hotel");
      expect(result.current.googleRating).toBeNull();
    });
  });

  describe("animation d'ouverture", () => {
    it("should slide the sheet into view when the modal is visible", () => {
      // Arrange & Act
      setup();

      // Assert
      expect(springSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ toValue: 0, tension: 65, friction: 11 })
      );
    });

    it("should park the sheet offscreen while the modal is hidden", () => {
      // Arrange & Act
      const { result } = setup({ visible: false });

      // Assert
      expect(springSpy).not.toHaveBeenCalled();
      expect((result.current.slideAnim as any).__getValue()).toBe(1000);
    });
  });

  describe("autocomplétion de l'adresse", () => {
    it("should not search when the address is shorter than three characters", async () => {
      // Arrange
      const { result } = setup();

      // Act
      await typeAddressAndFlush(result, "ru");

      // Assert
      expect(mockGetSuggestions).not.toHaveBeenCalled();
      expect(result.current.suggestions).toEqual([]);
    });

    it("should not search before the debounce delay has elapsed", async () => {
      // Arrange
      const { result } = setup();

      // Act
      act(() => result.current.handleInputChange("address", "rue de Paris"));
      await act(async () => {
        jest.advanceTimersByTime(DEBOUNCE_MS - 1);
      });

      // Assert
      expect(mockGetSuggestions).not.toHaveBeenCalled();
    });

    it("should search the trimmed address once the debounce delay elapses", async () => {
      // Arrange
      const { result } = setup();

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
      const { result } = setup();

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

    it("should expose the suggestions returned by the search", async () => {
      // Arrange
      mockGetSuggestions.mockResolvedValue([SUGGESTION]);
      const { result } = setup();

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
      const { result } = setup();

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
      const { result } = setup();
      await typeAddressAndFlush(result, "rue de Paris");

      // Act
      act(() => result.current.handleInputChange("address", "ru"));

      // Assert
      expect(result.current.suggestions).toEqual([]);
    });

    it("should cancel the pending search when the address changes again", async () => {
      // Arrange
      const { result } = setup();

      // Act
      act(() => result.current.handleInputChange("address", "rue de Par"));
      act(() => result.current.handleInputChange("address", "rue de Paris"));
      await act(async () => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });

      // Assert
      expect(mockGetSuggestions).toHaveBeenCalledTimes(1);
      expect(mockGetSuggestions).toHaveBeenCalledWith(
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
      const { result } = setup();

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
      const { result } = setup();

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
      const { result, unmount } = setup();
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

  describe("handleInputChange", () => {
    it("should update only the edited field", () => {
      // Arrange
      const { result } = setup();

      // Act
      act(() => result.current.handleInputChange("city", "Lyon"));

      // Assert
      expect(result.current.form.city).toBe("Lyon");
      expect(result.current.form.country).toBe("");
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
      const { result } = setup();

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
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handleSuggestionPress(SUGGESTION);
      });

      // Assert
      expect(result.current.form.name).toBe("Hôtel Central");
      expect(result.current.form.address).toBe(SUGGESTION.description);
    });

    it("should keep the already typed city and country when details omit them", async () => {
      // Arrange
      mockGetPlaceDetails.mockResolvedValue({});
      const { result } = setup();
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
        phone: "0102030405",
        website: "https://a.fr",
      });
    });

    it("should store the rating and the photo returned by the details", async () => {
      // Arrange
      mockGetPlaceDetails.mockResolvedValue({
        rating: 4.7,
        photoUrl: "https://photo.jpg",
      });
      const { result, onSave } = setup();
      act(() => result.current.handleInputChange("address", "1 rue"));
      act(() => result.current.handleInputChange("city", "Paris"));
      act(() => result.current.handleInputChange("country", "France"));

      // Act
      await act(async () => {
        await result.current.handleSuggestionPress(SUGGESTION);
      });
      await act(async () => {
        await result.current.handleSave();
      });

      // Assert
      expect(result.current.googleRating).toBe(4.7);
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 4.7, photoUrl: "https://photo.jpg" })
      );
    });

    it("should keep the previous rating when the details carry none", async () => {
      // Arrange
      mockGetPlaceDetails.mockResolvedValue({});
      const { result } = setup({
        initialAddress: makeAddress({ rating: 3.1 }),
      });

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
      const { result } = setup();
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
      const { result } = setup();

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
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handleSuggestionPress(SUGGESTION);
      });

      // Assert
      expect(console.error).toHaveBeenCalledWith("Place details error:", failure);
      expect(result.current.fetchingPlaceDetails).toBe(false);
    });
  });

  describe("handleSave", () => {
    const fillRequiredFields = (
      result: { current: ReturnType<typeof useAddressFormModal> },
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

    it("should refuse to save when the address is blank", async () => {
      // Arrange
      const { result, onSave } = setup();
      fillRequiredFields(result, { address: "   " });

      // Act
      await act(async () => {
        await result.current.handleSave();
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "common.error",
        "addresses.form.requiredFields"
      );
      expect(onSave).not.toHaveBeenCalled();
    });

    it("should refuse to save when the city is blank", async () => {
      // Arrange
      const { result, onSave } = setup();
      fillRequiredFields(result, { city: "  " });

      // Act
      await act(async () => {
        await result.current.handleSave();
      });

      // Assert
      expect(onSave).not.toHaveBeenCalled();
    });

    it("should refuse to save when the country is blank", async () => {
      // Arrange
      const { result, onSave } = setup();
      fillRequiredFields(result, { country: "" });

      // Act
      await act(async () => {
        await result.current.handleSave();
      });

      // Assert
      expect(onSave).not.toHaveBeenCalled();
    });

    it("should save the trimmed payload when the required fields are filled", async () => {
      // Arrange
      const { result, onSave } = setup();
      fillRequiredFields(result, { address: "  1 rue de Paris  " });
      act(() => result.current.handleInputChange("name", "  Hôtel Central  "));

      // Act
      await act(async () => {
        await result.current.handleSave();
      });

      // Assert
      expect(onSave).toHaveBeenCalledWith({
        type: "hotel",
        name: "Hôtel Central",
        address: "1 rue de Paris",
        city: "Paris",
        country: "France",
        phone: undefined,
        website: undefined,
        notes: undefined,
        rating: undefined,
        photoUrl: undefined,
      });
    });

    it("should include the optional fields when they are filled", async () => {
      // Arrange
      const { result, onSave } = setup();
      fillRequiredFields(result);
      act(() => result.current.handleInputChange("phone", "01 02 03 04 05"));
      act(() => result.current.handleInputChange("website", "https://central.fr"));
      act(() => result.current.handleInputChange("notes", "Réserver tôt"));

      // Act
      await act(async () => {
        await result.current.handleSave();
      });

      // Assert
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "01 02 03 04 05",
          website: "https://central.fr",
          notes: "Réserver tôt",
        })
      );
    });

    it("should close the modal once the save succeeds", async () => {
      // Arrange
      const { result, onClose } = setup();
      fillRequiredFields(result);

      // Act
      await act(async () => {
        await result.current.handleSave();
      });

      // Assert
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should report the save as in progress until it settles", async () => {
      // Arrange
      let resolveSave!: () => void;
      const onSave = jest.fn().mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
      );
      const { result } = setup({ onSave });
      fillRequiredFields(result);

      // Act
      act(() => {
        void result.current.handleSave();
      });

      // Assert
      expect(result.current.submitting).toBe(true);
      await act(async () => {
        resolveSave();
      });
      expect(result.current.submitting).toBe(false);
    });

    it("should keep the modal open and log the failure when the save rejects", async () => {
      // Arrange
      const failure = new Error("save failed");
      const onSave = jest.fn().mockRejectedValue(failure);
      const { result, onClose } = setup({ onSave });
      fillRequiredFields(result);

      // Act
      await act(async () => {
        await result.current.handleSave();
      });

      // Assert
      expect(console.error).toHaveBeenCalledWith("Address save error:", failure);
      expect(onClose).not.toHaveBeenCalled();
      expect(result.current.submitting).toBe(false);
    });

    it("should save the rating and the photo carried by the edited address", async () => {
      // Arrange
      const { result, onSave } = setup({
        initialAddress: makeAddress({
          rating: 4.5,
          photoUrl: "https://photo.jpg",
        }),
      });

      // Act
      await act(async () => {
        await result.current.handleSave();
      });

      // Assert
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 4.5,
          photoUrl: "https://photo.jpg",
        })
      );
    });
  });
});
