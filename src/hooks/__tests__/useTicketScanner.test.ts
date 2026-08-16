import { renderHook, act } from "@testing-library/react-native";
import { Animated } from "react-native";
import { useTicketScanner, type ScannedBookingData } from "../useTicketScanner";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockPermission = { granted: true, canAskAgain: true, status: "granted" };
const mockRequestPermission = jest.fn();
jest.mock("expo-camera", () => ({
  useCameraPermissions: () => [mockPermission, mockRequestPermission],
}));

const mockRequestMediaLibraryPermissions = jest.fn();
const mockLaunchImageLibrary = jest.fn();
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) =>
    mockRequestMediaLibraryPermissions(...args),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibrary(...args),
}));

const mockGetDocument = jest.fn();
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocument(...args),
}));

const mockScan = jest.fn();
jest.mock("@react-native-ml-kit/barcode-scanning", () => ({
  __esModule: true,
  default: { scan: (...args: unknown[]) => mockScan(...args) },
}));

const NOW = new Date("2026-06-15T12:00:00.000Z");
const INITIAL_DEV = (globalThis as unknown as { __DEV__: boolean }).__DEV__;

/**
 * Construit une carte d'embarquement au format BCBP (IATA 792) : les champs sont
 * positionnels, d'où le remplissage à largeur fixe.
 */
function makeBoardingPass({
  pnr = "ABC1234",
  from = "CDG",
  to = "NRT",
  carrier = "AF ",
  flight = "00276",
  julian = "001",
} = {}) {
  const header = "M1DUPONT/JEAN".padEnd(23, " ");
  return (header + pnr + from + to + carrier + flight + julian).padEnd(60, " ");
}

function setup() {
  const onFill = jest.fn();
  const onClose = jest.fn();
  const { result } = renderHook(() => useTicketScanner(true, onFill, onClose));
  return { result, onFill, onClose };
}

/** Scanne un code depuis la caméra et renvoie les données extraites. */
function scanFromCamera(result: { current: ReturnType<typeof useTicketScanner> }, raw: string) {
  act(() => {
    result.current.handleBarcodeScanned({ type: "qr", data: raw });
  });
  return result.current.parsedData as ScannedBookingData;
}

describe("useTicketScanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.spyOn(console, "warn").mockImplementation(() => {});
    // Les animations sont la frontière native du hook : on les exécute
    // instantanément pour que les callbacks de fin soient déterministes.
    jest
      .spyOn(Animated, "timing")
      .mockImplementation(
        (_value, config) =>
          ({
            start: (cb?: (r: { finished: boolean }) => void) => cb?.({ finished: true }),
          }) as unknown as ReturnType<typeof Animated.timing>,
      );
    jest
      .spyOn(Animated, "spring")
      .mockImplementation(
        () =>
          ({
            start: (cb?: (r: { finished: boolean }) => void) => cb?.({ finished: true }),
          }) as unknown as ReturnType<typeof Animated.spring>,
      );
  });

  afterEach(() => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = INITIAL_DEV;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("initial state", () => {
    it("should start in the choose mode with nothing scanned", () => {
      // Arrange & Act
      const { result } = setup();

      // Assert
      expect(result.current.mode).toBe("choose");
      expect(result.current.scanned).toBe(false);
      expect(result.current.parsedData).toBeNull();
      expect(result.current.rawData).toBe("");
      expect(result.current.scanError).toBeNull();
      expect(result.current.previewUri).toBeNull();
    });

    it("should expose the camera permission and its request function", () => {
      // Arrange & Act
      const { result } = setup();

      // Assert
      expect(result.current.permission).toBe(mockPermission);
      expect(result.current.requestPermission).toBe(mockRequestPermission);
    });
  });

  describe("boarding pass parsing", () => {
    it("should extract the route, the flight number and the booking reference", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, makeBoardingPass());

      // Assert
      expect(parsed).toMatchObject({
        type: "flight",
        title: "CDG → NRT · AF276",
        confirmationNumber: "ABC1234",
      });
    });

    it("should keep the raw payload alongside the parsed data", () => {
      // Arrange
      const { result } = setup();
      const raw = makeBoardingPass();

      // Act
      scanFromCamera(result, raw);

      // Assert
      expect(result.current.rawData).toBe(raw);
      expect(result.current.scanned).toBe(true);
    });

    it("should omit the flight suffix when the flight number is blank", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, makeBoardingPass({ flight: "     " }));

      // Assert
      expect(parsed.title).toBe("CDG → NRT");
    });

    it("should omit the booking reference when it is blank", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, makeBoardingPass({ pnr: "       " }));

      // Assert
      expect(parsed.confirmationNumber).toBeUndefined();
    });

    it("should push a past julian date to the following year", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, makeBoardingPass({ julian: "001" }));

      // Assert
      expect(parsed.date!.getFullYear()).toBe(NOW.getFullYear() + 1);
    });

    it("should keep an upcoming julian date in the current year", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, makeBoardingPass({ julian: "200" }));

      // Assert
      expect(parsed.date!.getFullYear()).toBe(NOW.getFullYear());
    });

    it("should leave the date empty when the julian day is not a number", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, makeBoardingPass({ julian: "XYZ" }));

      // Assert
      expect(parsed.date).toBeUndefined();
    });

    it("should fall back to the generic parser when the payload is too short", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, "M1TROP/COURT");

      // Assert
      expect(parsed.type).toBeUndefined();
      expect(parsed.title).toBeUndefined();
    });
  });

  describe("generic ticket parsing", () => {
    it("should read an ISO date, a time and a route", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, "2026-03-15 10:30 PARIS>LYON");

      // Assert
      expect(parsed.date!.toISOString()).toBe("2026-03-15T00:00:00.000Z");
      expect(parsed.time).toBe("10:30");
      expect(parsed.title).toBe("PARIS → LYON");
    });

    it("should not set a date when the ISO date is not a real day", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, "9999-99-99 PARIS>LYON");

      // Assert
      expect(parsed.date).toBeUndefined();
    });

    it("should read a French formatted date when there is no ISO date", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, "15/03/2026 PARIS>LYON");

      // Assert
      expect(parsed.date!.toISOString()).toBe("2026-03-15T00:00:00.000Z");
    });

    it("should not set a date when the French formatted date is not a real day", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, "99/99/2026 PARIS>LYON");

      // Assert
      expect(parsed.date).toBeUndefined();
    });

    it("should leave the date and time empty when the payload holds none", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, "PARIS>LYON");

      // Assert
      expect(parsed.date).toBeUndefined();
      expect(parsed.time).toBeUndefined();
    });

    it("should classify the ticket as a train when the payload mentions a rail operator", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, "TGV PARIS>LYON");

      // Assert
      expect(parsed.type).toBe("train");
    });

    it("should classify the ticket as a flight when the payload mentions boarding", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, "BOARDING PARIS>TOKYO");

      // Assert
      expect(parsed.type).toBe("flight");
    });

    it("should leave the type undefined when no transport keyword is present", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, "PARIS>LYON");

      // Assert
      expect(parsed.type).toBeUndefined();
    });

    it("should leave the title empty when the payload holds no route", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, "billet du 15/03/2026");

      // Assert
      expect(parsed.title).toBeUndefined();
    });

    it("should read a booking reference when the payload holds one", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, "reference XY7Z9");

      // Assert
      expect(parsed.confirmationNumber).toBe("XY7Z9");
    });

    it("should leave the booking reference empty when no code matches", () => {
      // Arrange
      const { result } = setup();

      // Act
      const parsed = scanFromCamera(result, "aucun code ici");

      // Assert
      expect(parsed.confirmationNumber).toBeUndefined();
    });
  });

  describe("handleBarcodeScanned", () => {
    it("should ignore a second scan while a result is already displayed", () => {
      // Arrange
      const { result } = setup();
      scanFromCamera(result, "PARIS>LYON");

      // Act
      act(() => {
        result.current.handleBarcodeScanned({ type: "qr", data: "MARSEILLE>NICE" });
      });

      // Assert
      expect(result.current.rawData).toBe("PARIS>LYON");
    });
  });

  describe("handleFill", () => {
    it("should hand the parsed data to the caller and close the scanner", () => {
      // Arrange
      const { result, onFill, onClose } = setup();
      const parsed = scanFromCamera(result, "TGV PARIS>LYON");

      // Act
      act(() => result.current.handleFill());

      // Assert
      expect(onFill).toHaveBeenCalledWith(parsed);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should do nothing when no result has been parsed yet", () => {
      // Arrange
      const { result, onFill, onClose } = setup();

      // Act
      act(() => result.current.handleFill());

      // Assert
      expect(onFill).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("handleRescan", () => {
    it("should clear the previous result and keep the camera mode", () => {
      // Arrange
      const { result } = setup();
      act(() => result.current.setMode("camera"));
      scanFromCamera(result, "PARIS>LYON");

      // Act
      act(() => result.current.handleRescan());

      // Assert
      expect(result.current.scanned).toBe(false);
      expect(result.current.parsedData).toBeNull();
      expect(result.current.rawData).toBe("");
      expect(result.current.mode).toBe("camera");
    });

    it("should return to the choose mode when the previous scan came from the gallery", async () => {
      // Arrange
      mockRequestMediaLibraryPermissions.mockResolvedValue({ status: "granted" });
      mockLaunchImageLibrary.mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file://ticket.png" }],
      });
      mockScan.mockResolvedValue([{ value: "PARIS>LYON" }]);
      const { result } = setup();
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Act
      act(() => result.current.handleRescan());

      // Assert
      expect(result.current.mode).toBe("choose");
      expect(result.current.previewUri).toBeNull();
    });
  });

  describe("reset", () => {
    it("should clear the result, the error and the preview", async () => {
      // Arrange
      mockRequestMediaLibraryPermissions.mockResolvedValue({ status: "denied" });
      const { result } = setup();
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Act
      act(() => result.current.reset());

      // Assert
      expect(result.current.scanError).toBeNull();
      expect(result.current.previewUri).toBeNull();
      expect(result.current.scanned).toBe(false);
    });
  });

  describe("handlePickImage", () => {
    it("should report a permission error when the media library access is refused", async () => {
      // Arrange
      mockRequestMediaLibraryPermissions.mockResolvedValue({ status: "denied" });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(result.current.scanError).toBe("bookings.permissionDenied");
      expect(mockLaunchImageLibrary).not.toHaveBeenCalled();
    });

    it("should scan the picked image and switch to the gallery mode", async () => {
      // Arrange
      mockRequestMediaLibraryPermissions.mockResolvedValue({ status: "granted" });
      mockLaunchImageLibrary.mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file://ticket.png" }],
      });
      mockScan.mockResolvedValue([{ value: "TGV PARIS>LYON" }]);
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(mockScan).toHaveBeenCalledWith("file://ticket.png");
      expect(result.current.mode).toBe("gallery");
      expect(result.current.previewUri).toBe("file://ticket.png");
      expect(result.current.parsedData).toMatchObject({ type: "train" });
    });

    it("should do nothing when the user cancels the picker", async () => {
      // Arrange
      mockRequestMediaLibraryPermissions.mockResolvedValue({ status: "granted" });
      mockLaunchImageLibrary.mockResolvedValue({ canceled: true });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(mockScan).not.toHaveBeenCalled();
      expect(result.current.mode).toBe("choose");
    });

    it("should do nothing when the picker returns no asset", async () => {
      // Arrange
      mockRequestMediaLibraryPermissions.mockResolvedValue({ status: "granted" });
      mockLaunchImageLibrary.mockResolvedValue({ canceled: false, assets: [] });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(mockScan).not.toHaveBeenCalled();
    });

    it("should report an error when the image holds no barcode", async () => {
      // Arrange
      mockRequestMediaLibraryPermissions.mockResolvedValue({ status: "granted" });
      mockLaunchImageLibrary.mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file://vide.png" }],
      });
      mockScan.mockResolvedValue([]);
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(result.current.scanError).toBe("bookings.scanNoCodeFound");
      expect(result.current.scanned).toBe(false);
    });

    it("should report an error when the scanner throws", async () => {
      // Arrange
      mockRequestMediaLibraryPermissions.mockResolvedValue({ status: "granted" });
      mockLaunchImageLibrary.mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file://corrompu.png" }],
      });
      mockScan.mockRejectedValue(new Error("décodage impossible"));
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(result.current.scanError).toBe("bookings.scanNoCodeFound");
      expect(result.current.scanning).toBe(false);
    });

    it("should stay silent on a scan failure when not running in dev mode", async () => {
      // Arrange
      (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
      mockRequestMediaLibraryPermissions.mockResolvedValue({ status: "granted" });
      mockLaunchImageLibrary.mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file://corrompu.png" }],
      });
      mockScan.mockRejectedValue(new Error("décodage impossible"));
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe("handlePickDocument", () => {
    it("should scan the picked document", async () => {
      // Arrange
      mockGetDocument.mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file://billet.pdf" }],
      });
      mockScan.mockResolvedValue([{ value: "BOARDING PARIS>TOKYO" }]);
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickDocument();
      });

      // Assert
      expect(mockGetDocument).toHaveBeenCalledWith({
        type: ["image/*"],
        copyToCacheDirectory: true,
      });
      expect(result.current.parsedData).toMatchObject({ type: "flight" });
    });

    it("should do nothing when the user cancels the document picker", async () => {
      // Arrange
      mockGetDocument.mockResolvedValue({ canceled: true });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickDocument();
      });

      // Assert
      expect(mockScan).not.toHaveBeenCalled();
    });

    it("should do nothing when the document picker returns no asset", async () => {
      // Arrange
      mockGetDocument.mockResolvedValue({ canceled: false, assets: [] });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickDocument();
      });

      // Assert
      expect(mockScan).not.toHaveBeenCalled();
    });
  });
});
