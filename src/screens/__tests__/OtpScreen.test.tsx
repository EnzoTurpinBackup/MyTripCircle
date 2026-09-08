import "./support/screenMocks";

import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import OtpScreen from "../OtpScreen";
import { restoreIntervals, useFakeIntervals } from "./support/fakeIntervals";
import { spyOnTextInputFocus } from "./support/textInputFocus";
import { lightColors, useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import ApiService from "../../services/ApiService";
import { parseApiError } from "../../utils/i18n";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}|${Object.values(options).join(",")}` : key,
  }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock("../../contexts/AuthContext", () => ({ useAuth: jest.fn() }));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: jest.fn(),
}));

jest.mock("../../utils/i18n", () => ({ parseApiError: jest.fn() }));

jest.mock("../../services/ApiService", () => ({
  __esModule: true,
  default: { resendOtp: jest.fn() },
}));

const api = ApiService as unknown as { resendOtp: jest.Mock };

const goBack = jest.fn();
const verifyOtp = jest.fn();

const USER_ID = "utilisateur-1";
const EMAIL = "voyageur@exemple.test";
const RESEND_DELAY_MS = 60_000;
const BOX_PLACEHOLDER = "otp.otpBoxPlaceholder";

let focusSpy: jest.SpyInstance;

/** Monte l'écran, avec ou sans adresse de destination du code. */
const renderScreen = (params: { userId: string; email?: string } = { userId: USER_ID, email: EMAIL }) => {
  (useRoute as jest.Mock).mockReturnValue({ params });
  render(<OtpScreen />);
};

const boxes = () => screen.getAllByPlaceholderText(BOX_PLACEHOLDER);

/** Saisit un code complet, case par case. */
const typeCode = (code: string) => {
  const inputs = boxes();
  [...code].forEach((digit, index) => {
    fireEvent.changeText(inputs[index], digit);
  });
};

/** Fait expirer le délai avant renvoi du code. */
const exhaustCountdown = () => {
  act(() => {
    jest.advanceTimersByTime(RESEND_DELAY_MS);
  });
};

describe("OtpScreen", () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    useFakeIntervals();
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    focusSpy = spyOnTextInputFocus();
    (useNavigation as jest.Mock).mockReturnValue({ goBack });
    (useTheme as jest.Mock).mockReturnValue({ colors: lightColors });
    (useAuth as jest.Mock).mockReturnValue({ verifyOtp });
    (parseApiError as jest.Mock).mockReturnValue("");
    verifyOtp.mockResolvedValue({ success: true });
    api.resendOtp.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    restoreIntervals();
  });

  describe("destinataire du code", () => {
    it("should show the address the code was sent to when it is known", () => {
      // Arrange & Act
      renderScreen();

      // Assert
      expect(screen.getByText(EMAIL)).toBeTruthy();
      expect(screen.queryByText(/otp\.subtitleEmailFallback/)).toBeNull();
    });

    it("should fall back to a generic wording when the address is unknown", () => {
      // Arrange & Act
      renderScreen({ userId: USER_ID });

      // Assert
      expect(screen.getByText(/otp\.subtitleEmailFallback/)).toBeTruthy();
      expect(screen.queryByText(EMAIL)).toBeNull();
    });

    it("should go back when the back button is pressed", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(goBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("saisie du code", () => {
    it("should offer one box per digit of the expected code", () => {
      // Arrange & Act
      renderScreen();

      // Assert
      expect(boxes()).toHaveLength(6);
    });

    it("should keep only the last digit typed into a box", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.changeText(boxes()[0], "7");

      // Assert
      expect(boxes()[0].props.value).toBe("7");
    });

    it("should reject a character that is not a digit", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.changeText(boxes()[0], "a");

      // Assert
      expect(boxes()[0].props.value).toBe("");
      expect(focusSpy).not.toHaveBeenCalled();
    });

    it("should move to the next box once a digit is entered", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.changeText(boxes()[0], "1");

      // Assert
      expect(focusSpy).toHaveBeenCalledTimes(1);
    });

    it("should stay on the last box when its digit is entered", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.changeText(boxes()[5], "9");

      // Assert
      expect(focusSpy).not.toHaveBeenCalled();
    });

    it("should move back to the previous box when backspace hits an empty one", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent(boxes()[3], "keyPress", { nativeEvent: { key: "Backspace" } });

      // Assert
      expect(focusSpy).toHaveBeenCalledTimes(1);
    });

    it("should stay on the first box when backspace hits it", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent(boxes()[0], "keyPress", { nativeEvent: { key: "Backspace" } });

      // Assert
      expect(focusSpy).not.toHaveBeenCalled();
    });

    it("should stay on the current box when backspace hits a filled one", () => {
      // Arrange
      renderScreen();
      fireEvent.changeText(boxes()[2], "4");
      focusSpy.mockClear();

      // Act
      fireEvent(boxes()[2], "keyPress", { nativeEvent: { key: "Backspace" } });

      // Assert
      expect(focusSpy).not.toHaveBeenCalled();
    });

    it("should ignore any key other than backspace", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent(boxes()[3], "keyPress", { nativeEvent: { key: "Enter" } });

      // Assert
      expect(focusSpy).not.toHaveBeenCalled();
    });
  });

  describe("vérification du code", () => {
    it("should keep the verify button disabled until the code is complete", () => {
      // Arrange
      renderScreen();

      // Act
      typeCode("12345");

      // Assert
      expect(screen.getByText("otp.verifyButton")).toBeDisabled();
    });

    it("should enable the verify button once the code is complete", () => {
      // Arrange
      renderScreen();

      // Act
      typeCode("123456");

      // Assert
      expect(screen.getByText("otp.verifyButton")).toBeEnabled();
    });

    it("should send the typed code to the API when the verify button is pressed", async () => {
      // Arrange
      renderScreen();
      typeCode("123456");

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("otp.verifyButton"));
      });

      // Assert
      expect(verifyOtp).toHaveBeenCalledWith(USER_ID, "123456");
      expect(screen.queryByText("otp.invalidCodeError")).toBeNull();
    });

    it("should show the translated API reason when the code is refused", async () => {
      // Arrange
      (parseApiError as jest.Mock).mockReturnValue("code expiré");
      verifyOtp.mockResolvedValue({ success: false, error: "Code expired" });
      renderScreen();
      typeCode("123456");

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("otp.verifyButton"));
      });

      // Assert
      expect(screen.getByText("code expiré")).toBeTruthy();
    });

    it("should show a generic refusal when the API gives no reason", async () => {
      // Arrange
      verifyOtp.mockResolvedValue({ success: false });
      renderScreen();
      typeCode("123456");

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("otp.verifyButton"));
      });

      // Assert
      expect(screen.getByText("otp.invalidCodeError")).toBeTruthy();
    });

    it("should clear the error as soon as a box is edited again", async () => {
      // Arrange
      verifyOtp.mockResolvedValue({ success: false });
      renderScreen();
      typeCode("123456");
      await act(async () => {
        fireEvent.press(screen.getByText("otp.verifyButton"));
      });

      // Act
      fireEvent.changeText(boxes()[0], "9");

      // Assert
      expect(screen.queryByText("otp.invalidCodeError")).toBeNull();
    });

    it("should report a network failure and log it in development builds", async () => {
      // Arrange
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      verifyOtp.mockRejectedValue(new Error("réseau indisponible"));
      renderScreen();
      typeCode("123456");

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("otp.verifyButton"));
      });

      // Assert
      expect(screen.getByText("otp.genericVerifyError")).toBeTruthy();
      expect(warn).toHaveBeenCalledWith("[OtpScreen] Erreur vérification OTP:", expect.any(Error));
    });

    it("should stay silent about the failure outside development builds", async () => {
      // Arrange
      const dev = globalThis as unknown as { __DEV__: boolean };
      const previous = dev.__DEV__;
      dev.__DEV__ = false;
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      verifyOtp.mockRejectedValue(new Error("réseau indisponible"));
      renderScreen();
      typeCode("123456");

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("otp.verifyButton"));
      });

      // Assert
      expect(screen.getByText("otp.genericVerifyError")).toBeTruthy();
      expect(warn).not.toHaveBeenCalled();
      dev.__DEV__ = previous;
    });

    it("should announce the pending state while the verification is in flight", async () => {
      // Arrange
      let release: (value: unknown) => void = () => {};
      verifyOtp.mockReturnValue(new Promise((r) => { release = r; }));
      renderScreen();
      typeCode("123456");

      // Act
      fireEvent.press(screen.getByText("otp.verifyButton"));

      // Assert
      expect(screen.getByText("otp.verifying")).toBeDisabled();
      await act(async () => { release({ success: true }); });
    });
  });

  describe("renvoi du code", () => {
    it("should count the remaining seconds down before offering a resend", () => {
      // Arrange
      renderScreen();

      // Assert
      expect(screen.getByText("otp.resendCountdown|60")).toBeTruthy();

      // Act
      act(() => { jest.advanceTimersByTime(1000); });

      // Assert
      expect(screen.getByText("otp.resendCountdown|59")).toBeTruthy();
    });

    it("should offer the resend link once the countdown is over", () => {
      // Arrange
      renderScreen();

      // Act
      exhaustCountdown();

      // Assert
      expect(screen.getByText("otp.resendLink")).toBeTruthy();
      expect(screen.queryByText("otp.resendCountdown|0")).toBeNull();
    });

    it("should ask the API for a new code and confirm it to the known address", async () => {
      // Arrange
      renderScreen();
      exhaustCountdown();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("otp.resendLink"));
      });

      // Assert
      expect(api.resendOtp).toHaveBeenCalledWith(USER_ID);
      expect(alert).toHaveBeenCalledWith(
        "otp.resendAlertTitle",
        `otp.resendAlertWithEmail|${EMAIL}`,
      );
    });

    it("should confirm the resend without naming an address when it is unknown", async () => {
      // Arrange
      renderScreen({ userId: USER_ID });
      exhaustCountdown();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("otp.resendLink"));
      });

      // Assert
      expect(alert).toHaveBeenCalledWith("otp.resendAlertTitle", "otp.resendAlertNoEmail");
    });

    it("should empty the boxes and clear the error when a new code is sent", async () => {
      // Arrange
      verifyOtp.mockResolvedValue({ success: false });
      renderScreen();
      typeCode("123456");
      await act(async () => {
        fireEvent.press(screen.getByText("otp.verifyButton"));
      });
      exhaustCountdown();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("otp.resendLink"));
      });

      // Assert
      expect(boxes().map((box) => box.props.value)).toEqual(["", "", "", "", "", ""]);
      expect(screen.queryByText("otp.invalidCodeError")).toBeNull();
    });

    it("should replace the link by a final notice so the code is sent only once", async () => {
      // Arrange
      renderScreen();
      exhaustCountdown();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("otp.resendLink"));
      });

      // Assert
      expect(screen.getByText("otp.resendDone")).toBeTruthy();
      expect(screen.queryByText("otp.resendLink")).toBeNull();
    });

    it("should surface the translated API reason when the resend fails", async () => {
      // Arrange
      (parseApiError as jest.Mock).mockReturnValue("trop de demandes");
      api.resendOtp.mockRejectedValue(new Error("429"));
      renderScreen();
      exhaustCountdown();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("otp.resendLink"));
      });

      // Assert
      expect(alert).toHaveBeenCalledWith("otp.resendErrorTitle", "trop de demandes");
      expect(screen.getByText("otp.resendLink")).toBeTruthy();
    });

    it("should fall back to a generic message when the resend error cannot be translated", async () => {
      // Arrange
      api.resendOtp.mockRejectedValue(new Error("boom"));
      renderScreen();
      exhaustCountdown();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("otp.resendLink"));
      });

      // Assert
      expect(alert).toHaveBeenCalledWith("otp.resendErrorTitle", "otp.resendErrorMessage");
    });

    it("should stop counting down when the screen is left", () => {
      // Arrange
      renderScreen();

      // Act
      screen.unmount();
      act(() => { jest.advanceTimersByTime(RESEND_DELAY_MS); });

      // Assert
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
