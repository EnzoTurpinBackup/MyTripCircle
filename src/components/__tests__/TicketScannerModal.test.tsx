import "./support/nativeMocks";

import React from "react";
import { ActivityIndicator, Animated, Image } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import TicketScannerModal from "../TicketScannerModal";
import { useTicketScanner } from "../../hooks/useTicketScanner";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("expo-camera", () => {
  const { View } = require("react-native");
  return {
    CameraView: (props: Record<string, unknown>) => <View testID="camera-view" {...props} />,
  };
});

// Le hook de scan est couvert par sa propre suite : la modale n'est testée que
// sur la façon dont elle restitue l'état qu'il expose.
jest.mock("../../hooks/useTicketScanner", () => ({
  useTicketScanner: jest.fn(),
}));

const useTicketScannerMock = useTicketScanner as jest.MockedFunction<
  typeof useTicketScanner
>;

type ScannerState = ReturnType<typeof useTicketScanner>;

const setScannerState = (overrides: Partial<ScannerState> = {}) => {
  const state = {
    t: (key: string) => key,
    permission: { granted: true },
    requestPermission: jest.fn(),
    mode: "choose",
    setMode: jest.fn(),
    scanned: false,
    parsedData: null,
    rawData: "",
    scanning: false,
    scanError: null,
    previewUri: null,
    panelAnim: new Animated.Value(0),
    reset: jest.fn(),
    handleFill: jest.fn(),
    handleRescan: jest.fn(),
    handleBarcodeScanned: jest.fn(),
    handlePickImage: jest.fn(),
    handlePickDocument: jest.fn(),
    ...overrides,
  } as unknown as ScannerState;
  useTicketScannerMock.mockReturnValue(state);
  return state;
};

const renderModal = (props: { visible?: boolean; onClose?: jest.Mock } = {}) => {
  const onClose = props.onClose ?? jest.fn();
  render(
    <TicketScannerModal
      visible={props.visible ?? true}
      onClose={onClose}
      onFill={jest.fn()}
    />,
  );
  return { onClose };
};

describe("TicketScannerModal", () => {
  describe("source picker", () => {
    it("should render the three scan sources", () => {
      setScannerState({ mode: "choose" });
      renderModal();

      expect(screen.getByText("bookings.scanCameraOption")).toBeTruthy();
      expect(screen.getByText("bookings.scanGalleryOption")).toBeTruthy();
      expect(screen.getByText("bookings.scanFileOption")).toBeTruthy();
    });

    it("should render nothing when the modal is closed", () => {
      setScannerState({ mode: "choose" });
      renderModal({ visible: false });

      expect(screen.queryByText("bookings.scanCameraOption")).toBeNull();
    });

    it("should switch to the camera when the camera source is chosen", () => {
      const state = setScannerState({ mode: "choose" });
      renderModal();

      fireEvent.press(screen.getByText("bookings.scanCameraOption"));

      expect(state.setMode).toHaveBeenCalledWith("camera");
    });

    it("should start an image pick when the gallery source is chosen", () => {
      const state = setScannerState({ mode: "choose" });
      renderModal();

      fireEvent.press(screen.getByText("bookings.scanGalleryOption"));

      expect(state.handlePickImage).toHaveBeenCalledTimes(1);
    });

    it("should start a document pick when the file source is chosen", () => {
      const state = setScannerState({ mode: "choose" });
      renderModal();

      fireEvent.press(screen.getByText("bookings.scanFileOption"));

      expect(state.handlePickDocument).toHaveBeenCalledTimes(1);
    });

    it("should close the modal when the close button is pressed", () => {
      setScannerState({ mode: "choose" });
      const { onClose } = renderModal();

      fireEvent.press(screen.UNSAFE_getByProps({ name: "close" }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should reset the scanner state when the modal becomes visible", () => {
      const state = setScannerState({ mode: "choose" });
      renderModal();

      expect(state.setMode).toHaveBeenCalledWith("choose");
      expect(state.reset).toHaveBeenCalledTimes(1);
    });
  });

  describe("camera permission", () => {
    it("should ask for the camera permission when it has not been granted", () => {
      setScannerState({ mode: "camera", permission: { granted: false } as never });
      renderModal();

      expect(screen.getByText("bookings.scanCameraPermissionTitle")).toBeTruthy();
    });

    it("should ask for the camera permission when it has not been requested yet", () => {
      setScannerState({ mode: "camera", permission: null as never });
      renderModal();

      expect(screen.getByText("bookings.scanCameraPermissionSubtitle")).toBeTruthy();
    });

    it("should request the permission when the grant button is pressed", () => {
      const state = setScannerState({
        mode: "camera",
        permission: { granted: false } as never,
      });
      renderModal();

      fireEvent.press(screen.getByText("bookings.scanCameraPermissionGrant"));

      expect(state.requestPermission).toHaveBeenCalledTimes(1);
    });

    it("should go back to the source picker when the permission screen is cancelled", () => {
      const state = setScannerState({
        mode: "camera",
        permission: { granted: false } as never,
      });
      renderModal();

      fireEvent.press(screen.getByText("common.cancel"));

      expect(state.setMode).toHaveBeenCalledWith("choose");
    });
  });

  describe("camera", () => {
    it("should render the viewfinder hint while nothing has been scanned", () => {
      setScannerState({ mode: "camera", scanned: false });
      renderModal();

      expect(screen.getByTestId("camera-view")).toBeTruthy();
      expect(screen.getByText("bookings.scanHint")).toBeTruthy();
    });

    it("should wire the barcode handler while nothing has been scanned", () => {
      const state = setScannerState({ mode: "camera", scanned: false });
      renderModal();

      expect(screen.getByTestId("camera-view").props.onBarcodeScanned).toBe(
        state.handleBarcodeScanned,
      );
    });

    it("should stop listening for barcodes once one has been scanned", () => {
      setScannerState({
        mode: "camera",
        scanned: true,
        parsedData: { title: "Vol AF123" } as never,
      });
      renderModal();

      expect(screen.getByTestId("camera-view").props.onBarcodeScanned).toBeUndefined();
    });

    it("should hide the viewfinder once a code has been scanned", () => {
      setScannerState({
        mode: "camera",
        scanned: true,
        parsedData: { title: "Vol AF123" } as never,
      });
      renderModal();

      expect(screen.queryByText("bookings.scanHint")).toBeNull();
    });

    it("should show the parsed result once a code has been scanned", () => {
      setScannerState({
        mode: "camera",
        scanned: true,
        parsedData: { title: "Vol AF123" } as never,
      });
      renderModal();

      expect(screen.getByText("Vol AF123")).toBeTruthy();
      expect(screen.getByText("bookings.scanFoundTitle")).toBeTruthy();
    });

    it("should not show a result panel when the scan produced no data", () => {
      setScannerState({ mode: "camera", scanned: true, parsedData: null });
      renderModal();

      expect(screen.queryByText("bookings.scanFoundTitle")).toBeNull();
    });

    it("should go back to the source picker from the camera header", () => {
      const state = setScannerState({ mode: "camera", scanned: false });
      renderModal();

      fireEvent.press(screen.getByLabelText("common.a11y.back"));

      expect(state.reset).toHaveBeenCalled();
      expect(state.setMode).toHaveBeenCalledWith("choose");
    });
  });

  describe("gallery", () => {
    it("should show the analysing status while the picture is being scanned", () => {
      setScannerState({ mode: "gallery", scanning: true });
      renderModal();

      expect(screen.getByText("bookings.scanAnalysing")).toBeTruthy();
      expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it("should preview the picked picture when there is one", () => {
      setScannerState({ mode: "gallery", previewUri: "file:///ticket.png" });
      renderModal();

      expect(screen.UNSAFE_getByType(Image).props.source.uri).toBe("file:///ticket.png");
    });

    it("should label the picked picture for assistive technologies when there is one", () => {
      setScannerState({ mode: "gallery", previewUri: "file:///ticket.png" });
      renderModal();

      expect(screen.getByLabelText("bookings.a11y.ticketPreview")).toBeTruthy();
    });

    it("should render no preview when no picture was picked", () => {
      setScannerState({ mode: "gallery", previewUri: null });
      renderModal();

      expect(screen.UNSAFE_queryByType(Image)).toBeNull();
    });

    it("should show the scan error once the analysis failed", () => {
      setScannerState({
        mode: "gallery",
        scanning: false,
        scanError: "Aucun code détecté",
      });
      renderModal();

      expect(screen.getByText("Aucun code détecté")).toBeTruthy();
    });

    it("should hide the scan error while the analysis is still running", () => {
      setScannerState({
        mode: "gallery",
        scanning: true,
        scanError: "Aucun code détecté",
      });
      renderModal();

      expect(screen.queryByText("Aucun code détecté")).toBeNull();
    });

    it("should offer another attempt after a failed analysis", () => {
      const state = setScannerState({
        mode: "gallery",
        scanning: false,
        scanError: "Aucun code détecté",
      });
      renderModal();

      fireEvent.press(screen.getByText("bookings.scanTryOther"));

      expect(state.reset).toHaveBeenCalled();
      expect(state.setMode).toHaveBeenCalledWith("choose");
    });

    it("should show the parsed result once the picture has been read", () => {
      setScannerState({
        mode: "gallery",
        scanning: false,
        scanned: true,
        parsedData: { confirmationNumber: "AF-99213" } as never,
      });
      renderModal();

      expect(screen.getByText("AF-99213")).toBeTruthy();
    });

    it("should fill the booking form when the result is confirmed", () => {
      const state = setScannerState({
        mode: "gallery",
        scanning: false,
        scanned: true,
        parsedData: { confirmationNumber: "AF-99213" } as never,
      });
      renderModal();

      fireEvent.press(screen.getByText("bookings.scanFillButton"));

      expect(state.handleFill).toHaveBeenCalledTimes(1);
    });

    it("should restart a scan when the rescan button is pressed", () => {
      const state = setScannerState({
        mode: "gallery",
        scanning: false,
        scanned: true,
        parsedData: { confirmationNumber: "AF-99213" } as never,
      });
      renderModal();

      fireEvent.press(screen.getByText("bookings.scanRescan"));

      expect(state.handleRescan).toHaveBeenCalledTimes(1);
    });

    it("should go back to the source picker from the gallery header", () => {
      const state = setScannerState({ mode: "gallery" });
      renderModal();

      fireEvent.press(screen.getByLabelText("common.a11y.back"));

      expect(state.setMode).toHaveBeenCalledWith("choose");
    });
  });
});
