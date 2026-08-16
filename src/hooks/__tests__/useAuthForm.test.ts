import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useAuthForm } from "../useAuthForm";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockLogin = jest.fn();
const mockRegister = jest.fn();
let mockAuthLoading = false;
jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ login: mockLogin, register: mockRegister, loading: mockAuthLoading }),
}));

const mockHandleGoogleToken = jest.fn();
const mockHandleAppleSignIn = jest.fn();
const mockUseSocialAuth = jest.fn((_mode?: "login" | "register") => ({
  isSocialSubmitting: false,
  handleGoogleToken: mockHandleGoogleToken,
  handleAppleSignIn: mockHandleAppleSignIn,
}));
jest.mock("../useSocialAuth", () => ({
  __esModule: true,
  default: (mode?: "login" | "register") => mockUseSocialAuth(mode),
}));

jest.mock("../../utils/i18n", () => ({
  parseApiError: jest.fn((error: unknown) => (error as Error)?.message ?? ""),
}));

const STRONG_PASSWORD = "Sup3rSecret!";
const noRedirect = jest.fn();

/** Remplit un formulaire d'inscription valide et accepte les CGU. */
function fillValidRegistration(result: { current: ReturnType<typeof useAuthForm> }) {
  act(() => result.current.setName("Ana"));
  act(() => result.current.handlePhoneChange("0612345678"));
  act(() => result.current.setEmail("ana@example.com"));
  act(() => result.current.setPassword(STRONG_PASSWORD));
  act(() => result.current.setConfirmPassword(STRONG_PASSWORD));
  act(() => result.current.setTermsAccepted(true));
}

/** Remplit un formulaire de connexion valide. */
function fillValidLogin(result: { current: ReturnType<typeof useAuthForm> }) {
  act(() => result.current.setEmail("ana@example.com"));
  act(() => result.current.setPassword("whatever"));
}

describe("useAuthForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthLoading = false;
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockLogin.mockResolvedValue({ success: true });
    mockRegister.mockResolvedValue({ success: true, userId: "user-1" });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("social authentication wiring", () => {
    it("should ask for the register mode when the form is not a login form", () => {
      // Arrange & Act
      renderHook(() => useAuthForm(false));

      // Assert
      expect(mockUseSocialAuth).toHaveBeenCalledWith("register");
    });

    it("should ask for the login mode when the form is a login form", () => {
      // Arrange & Act
      renderHook(() => useAuthForm(true));

      // Assert
      expect(mockUseSocialAuth).toHaveBeenCalledWith("login");
    });

    it("should expose the social handlers coming from the social auth hook", () => {
      // Arrange & Act
      const { result } = renderHook(() => useAuthForm());

      // Assert
      expect(result.current.handleGoogleToken).toBe(mockHandleGoogleToken);
      expect(result.current.handleAppleSignIn).toBe(mockHandleAppleSignIn);
    });
  });

  describe("busy", () => {
    it("should be busy when the auth context is loading", () => {
      // Arrange
      mockAuthLoading = true;

      // Act
      const { result } = renderHook(() => useAuthForm());

      // Assert
      expect(result.current.busy).toBe(true);
    });

    it("should be idle when neither the context nor the form is working", () => {
      // Arrange & Act
      const { result } = renderHook(() => useAuthForm());

      // Assert
      expect(result.current.busy).toBe(false);
    });
  });

  describe("validateEmail", () => {
    it("should reject an empty email with the mandatory field message", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());

      // Act
      let valid: boolean | undefined;
      act(() => {
        valid = result.current.validateEmail("");
      });

      // Assert
      expect(valid).toBe(false);
      expect(result.current.errors.email).toBe("common.fillAllFields");
    });

    it("should reject a malformed email with the invalid email message", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());

      // Act
      let valid: boolean | undefined;
      act(() => {
        valid = result.current.validateEmail("pas-un-email");
      });

      // Assert
      expect(valid).toBe(false);
      expect(result.current.errors.email).toBe("common.invalidEmail");
    });

    it("should accept a well-formed email and clear the error", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());
      act(() => result.current.setEmailError("common.invalidEmail"));

      // Act
      let valid: boolean | undefined;
      act(() => {
        valid = result.current.validateEmail("ana@example.com");
      });

      // Assert
      expect(valid).toBe(true);
      expect(result.current.errors.email).toBe("");
    });
  });

  describe("validatePasswordRequired", () => {
    it("should reject an empty password", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());

      // Act
      let valid: boolean | undefined;
      act(() => {
        valid = result.current.validatePasswordRequired("");
      });

      // Assert
      expect(valid).toBe(false);
      expect(result.current.errors.password).toBe("common.fillAllFields");
    });

    it("should accept any non-empty password", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());

      // Act
      let valid: boolean | undefined;
      act(() => {
        valid = result.current.validatePasswordRequired("x");
      });

      // Assert
      expect(valid).toBe(true);
      expect(result.current.errors.password).toBe("");
    });
  });

  describe("validatePasswordStrong", () => {
    it("should reject an empty password with the mandatory field message", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());

      // Act
      let valid: boolean | undefined;
      act(() => {
        valid = result.current.validatePasswordStrong("");
      });

      // Assert
      expect(valid).toBe(false);
      expect(result.current.errors.password).toBe("common.fillAllFields");
    });

    it("should reject a weak password with the invalid password message", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());

      // Act
      let valid: boolean | undefined;
      act(() => {
        valid = result.current.validatePasswordStrong("azerty");
      });

      // Assert
      expect(valid).toBe(false);
      expect(result.current.errors.password).toBe("common.invalidPassword");
    });

    it("should accept a strong password", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());

      // Act
      let valid: boolean | undefined;
      act(() => {
        valid = result.current.validatePasswordStrong(STRONG_PASSWORD);
      });

      // Assert
      expect(valid).toBe(true);
      expect(result.current.errors.password).toBe("");
    });
  });

  describe("validateName", () => {
    it("should reject a name shorter than two characters", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());

      // Act
      let valid: boolean | undefined;
      act(() => {
        valid = result.current.validateName("A");
      });

      // Assert
      expect(valid).toBe(false);
      expect(result.current.errors.name).toBe("common.fillAllFields");
    });

    it("should accept a name of at least two characters", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());

      // Act
      let valid: boolean | undefined;
      act(() => {
        valid = result.current.validateName("Ana");
      });

      // Assert
      expect(valid).toBe(true);
      expect(result.current.errors.name).toBe("");
    });
  });

  describe("validatePhone", () => {
    it("should reject a malformed phone number", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());

      // Act
      let valid: boolean | undefined;
      act(() => {
        valid = result.current.validatePhone("abc");
      });

      // Assert
      expect(valid).toBe(false);
      expect(result.current.errors.phone).toBe("common.invalidPhone");
    });

    it("should accept a well-formed phone number", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());

      // Act
      let valid: boolean | undefined;
      act(() => {
        valid = result.current.validatePhone("06 12 34 56 78");
      });

      // Assert
      expect(valid).toBe(true);
      expect(result.current.errors.phone).toBe("");
    });
  });

  describe("validateConfirmPassword", () => {
    it("should reject an empty confirmation", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());

      // Act
      let valid: boolean | undefined;
      act(() => {
        valid = result.current.validateConfirmPassword("");
      });

      // Assert
      expect(valid).toBe(false);
      expect(result.current.errors.confirmPassword).toBe("common.fillAllFields");
    });

    it("should reject a confirmation differing from the password", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());
      act(() => result.current.setPassword(STRONG_PASSWORD));

      // Act
      let valid: boolean | undefined;
      act(() => {
        valid = result.current.validateConfirmPassword("autre-chose");
      });

      // Assert
      expect(valid).toBe(false);
      expect(result.current.errors.confirmPassword).toBe("common.passwordsDoNotMatch");
    });

    it("should accept a confirmation matching the password", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());
      act(() => result.current.setPassword(STRONG_PASSWORD));

      // Act
      let valid: boolean | undefined;
      act(() => {
        valid = result.current.validateConfirmPassword(STRONG_PASSWORD);
      });

      // Assert
      expect(valid).toBe(true);
      expect(result.current.errors.confirmPassword).toBe("");
    });
  });

  describe("handlePhoneChange", () => {
    it("should format the typed digits into pairs", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());

      // Act
      act(() => result.current.handlePhoneChange("0612345678"));

      // Assert
      expect(result.current.phone).toBe("06 12 34 56 78");
    });

    it("should clear a pending phone error when the user types again", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());
      act(() => result.current.setPhoneError("common.invalidPhone"));

      // Act
      act(() => result.current.handlePhoneChange("06"));

      // Assert
      expect(result.current.errors.phone).toBe("");
    });
  });

  describe("switchMode", () => {
    it("should clear every error, the phone, the confirmation and the terms", () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());
      act(() => result.current.setEmailError("e"));
      act(() => result.current.setPasswordError("p"));
      act(() => result.current.setConfirmPasswordError("c"));
      act(() => result.current.setNameError("n"));
      act(() => result.current.setPhoneError("t"));
      act(() => result.current.handlePhoneChange("0612345678"));
      act(() => result.current.setConfirmPassword(STRONG_PASSWORD));
      act(() => result.current.setTermsAccepted(true));

      // Act
      act(() => result.current.switchMode());

      // Assert
      expect(result.current.errors).toEqual({
        email: "",
        password: "",
        confirmPassword: "",
        name: "",
        phone: "",
      });
      expect(result.current.phone).toBe("");
      expect(result.current.confirmPassword).toBe("");
      expect(result.current.termsAccepted).toBe(false);
    });
  });

  describe("handleSubmit in login mode", () => {
    it("should call the login of the auth context with the typed credentials", async () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm(true));
      fillValidLogin(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(true, noRedirect);
      });

      // Assert
      expect(mockLogin).toHaveBeenCalledWith("ana@example.com", "whatever");
    });

    it("should not call the login when the email is invalid", async () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm(true));
      act(() => result.current.setEmail("pas-un-email"));
      act(() => result.current.setPassword("whatever"));

      // Act
      await act(async () => {
        await result.current.handleSubmit(true, noRedirect);
      });

      // Assert
      expect(mockLogin).not.toHaveBeenCalled();
      expect(result.current.errors.email).toBe("common.invalidEmail");
    });

    it("should not call the login when the password is missing", async () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm(true));
      act(() => result.current.setEmail("ana@example.com"));

      // Act
      await act(async () => {
        await result.current.handleSubmit(true, noRedirect);
      });

      // Assert
      expect(mockLogin).not.toHaveBeenCalled();
      expect(result.current.errors.password).toBe("common.fillAllFields");
    });

    it("should show the invalid credentials message when the server rejects the pair", async () => {
      // Arrange
      mockLogin.mockResolvedValue({ success: false, error: "Invalid credentials" });
      const { result } = renderHook(() => useAuthForm(true));
      fillValidLogin(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(true, noRedirect);
      });

      // Assert
      expect(result.current.errors.password).toBe("common.invalidCredentials");
    });

    it("should surface the parsed server error on the password field for other failures", async () => {
      // Arrange
      mockLogin.mockResolvedValue({ success: false, error: "Account locked" });
      const { result } = renderHook(() => useAuthForm(true));
      fillValidLogin(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(true, noRedirect);
      });

      // Assert
      expect(result.current.errors.password).toBe("Account locked");
    });

    it("should surface the parsed server error on the email field when the server blames it", async () => {
      // Arrange
      mockLogin.mockResolvedValue({ success: false, field: "email", error: "Unknown email" });
      const { result } = renderHook(() => useAuthForm(true));
      fillValidLogin(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(true, noRedirect);
      });

      // Assert
      expect(result.current.errors.email).toBe("Unknown email");
    });

    it("should prompt for the OTP when the server requires one", async () => {
      // Arrange
      mockLogin.mockResolvedValue({ success: false, requiresOtp: true, userId: "user-1" });
      const { result } = renderHook(() => useAuthForm(true));
      fillValidLogin(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(true, noRedirect);
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.info", "common.requiresOtp", expect.any(Array));
    });

    it("should prompt with the expired OTP message when the server says the code expired", async () => {
      // Arrange
      mockLogin.mockResolvedValue({
        success: false,
        requiresOtp: true,
        userId: "user-1",
        error: "OTP expired",
      });
      const { result } = renderHook(() => useAuthForm(true));
      fillValidLogin(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(true, noRedirect);
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "common.info",
        "common.requiresOtpExpired",
        expect.any(Array),
      );
    });

    it("should recognise the French wording of an expired OTP", async () => {
      // Arrange
      mockLogin.mockResolvedValue({
        success: false,
        requiresOtp: true,
        userId: "user-1",
        error: "Code expiré",
      });
      const { result } = renderHook(() => useAuthForm(true));
      fillValidLogin(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(true, noRedirect);
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "common.info",
        "common.requiresOtpExpired",
        expect.any(Array),
      );
    });

    it("should redirect to the OTP screen when the prompt is acknowledged", async () => {
      // Arrange
      mockLogin.mockResolvedValue({ success: false, requiresOtp: true, userId: "user-1" });
      const onOtpRedirect = jest.fn();
      const { result } = renderHook(() => useAuthForm(true));
      fillValidLogin(result);
      await act(async () => {
        await result.current.handleSubmit(true, onOtpRedirect);
      });

      // Act
      act(() => {
        const buttons = (Alert.alert as unknown as jest.Mock).mock.calls.slice(-1)[0][2];
        buttons[0].onPress();
      });

      // Assert
      expect(onOtpRedirect).toHaveBeenCalledWith("user-1", "ana@example.com");
    });

    it("should treat a missing userId as a regular failure rather than an OTP prompt", async () => {
      // Arrange
      mockLogin.mockResolvedValue({ success: false, requiresOtp: true, error: "Invalid credentials" });
      const { result } = renderHook(() => useAuthForm(true));
      fillValidLogin(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(true, noRedirect);
      });

      // Assert
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(result.current.errors.password).toBe("common.invalidCredentials");
    });

    it("should alert the parsed error when the login throws", async () => {
      // Arrange
      mockLogin.mockRejectedValue(new Error("network down"));
      const { result } = renderHook(() => useAuthForm(true));
      fillValidLogin(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(true, noRedirect);
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "network down");
    });

    it("should alert a generic message when the thrown error cannot be parsed", async () => {
      // Arrange
      mockLogin.mockRejectedValue(new Error(""));
      const { result } = renderHook(() => useAuthForm(true));
      fillValidLogin(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(true, noRedirect);
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "common.unexpectedError");
    });

    it("should clear the submitting flag once the login settles", async () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm(true));
      fillValidLogin(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(true, noRedirect);
      });

      // Assert
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe("handleSubmit in register mode", () => {
    it("should register the user and redirect to the OTP screen when the server returns a user id", async () => {
      // Arrange
      const onOtpRedirect = jest.fn();
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(false, onOtpRedirect);
      });

      // Assert
      expect(mockRegister).toHaveBeenCalledWith(
        "Ana",
        "ana@example.com",
        STRONG_PASSWORD,
        "06 12 34 56 78",
      );
      expect(onOtpRedirect).toHaveBeenCalledWith("user-1", "ana@example.com");
    });

    it("should not redirect when the successful registration returns no user id", async () => {
      // Arrange
      mockRegister.mockResolvedValue({ success: true });
      const onOtpRedirect = jest.fn();
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(false, onOtpRedirect);
      });

      // Assert
      expect(onOtpRedirect).not.toHaveBeenCalled();
    });

    it("should not register when the name is invalid", async () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);
      act(() => result.current.setName("A"));

      // Act
      await act(async () => {
        await result.current.handleSubmit(false, noRedirect);
      });

      // Assert
      expect(mockRegister).not.toHaveBeenCalled();
      expect(result.current.errors.name).toBe("common.fillAllFields");
    });

    it("should not register when the confirmation does not match", async () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);
      act(() => result.current.setConfirmPassword("autre-chose"));

      // Act
      await act(async () => {
        await result.current.handleSubmit(false, noRedirect);
      });

      // Assert
      expect(mockRegister).not.toHaveBeenCalled();
      expect(result.current.errors.confirmPassword).toBe("common.passwordsDoNotMatch");
    });

    it("should require the terms to be accepted before registering", async () => {
      // Arrange
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);
      act(() => result.current.setTermsAccepted(false));

      // Act
      await act(async () => {
        await result.current.handleSubmit(false, noRedirect);
      });

      // Assert
      expect(mockRegister).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "auth.termsRequired");
    });

    it("should prompt for the OTP when the registration requires one", async () => {
      // Arrange
      mockRegister.mockResolvedValue({ success: false, requiresOtp: true, userId: "user-1" });
      const onOtpRedirect = jest.fn();
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);
      await act(async () => {
        await result.current.handleSubmit(false, onOtpRedirect);
      });

      // Act
      act(() => {
        const buttons = (Alert.alert as unknown as jest.Mock).mock.calls.slice(-1)[0][2];
        buttons[0].onPress();
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.info", "common.requiresOtp", expect.any(Array));
      expect(onOtpRedirect).toHaveBeenCalledWith("user-1", "ana@example.com");
    });

    it("should surface the parsed error on the name field when the server blames it", async () => {
      // Arrange
      mockRegister.mockResolvedValue({ success: false, field: "name", error: "Name too short" });
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(false, noRedirect);
      });

      // Assert
      expect(result.current.errors.name).toBe("Name too short");
    });

    it("should translate the invalid phone error reported by the server", async () => {
      // Arrange
      mockRegister.mockResolvedValue({ success: false, field: "phone", error: "Invalid phone number" });
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(false, noRedirect);
      });

      // Assert
      expect(result.current.errors.phone).toBe("common.invalidPhone");
    });

    it("should surface the parsed error on the phone field for other phone failures", async () => {
      // Arrange
      mockRegister.mockResolvedValue({ success: false, field: "phone", error: "Phone already used" });
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(false, noRedirect);
      });

      // Assert
      expect(result.current.errors.phone).toBe("Phone already used");
    });

    it("should translate the already used email error reported by the server", async () => {
      // Arrange
      mockRegister.mockResolvedValue({ success: false, field: "email", error: "Email already in use" });
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(false, noRedirect);
      });

      // Assert
      expect(result.current.errors.email).toBe("common.emailAlreadyInUse");
    });

    it("should surface the parsed error on the email field for other email failures", async () => {
      // Arrange
      mockRegister.mockResolvedValue({ success: false, field: "email", error: "Domain blocked" });
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(false, noRedirect);
      });

      // Assert
      expect(result.current.errors.email).toBe("Domain blocked");
    });

    it("should translate a weak password reported by the server", async () => {
      // Arrange
      mockRegister.mockResolvedValue({ success: false, field: "password", error: "Weak password" });
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(false, noRedirect);
      });

      // Assert
      expect(result.current.errors.password).toBe("common.invalidPassword");
    });

    it("should translate a too short password reported by the server", async () => {
      // Arrange
      mockRegister.mockResolvedValue({
        success: false,
        field: "password",
        error: "Password must be at least 8 characters",
      });
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(false, noRedirect);
      });

      // Assert
      expect(result.current.errors.password).toBe("common.invalidPassword");
    });

    it("should surface the parsed error on the password field for other password failures", async () => {
      // Arrange
      mockRegister.mockResolvedValue({ success: false, field: "password", error: "Password reused" });
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(false, noRedirect);
      });

      // Assert
      expect(result.current.errors.password).toBe("Password reused");
    });

    it("should alert the parsed error when the failure targets no specific field", async () => {
      // Arrange
      mockRegister.mockResolvedValue({ success: false, error: "Service unavailable" });
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(false, noRedirect);
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "Service unavailable");
    });

    it("should alert a generic message when the failure carries no reason", async () => {
      // Arrange
      mockRegister.mockResolvedValue({ success: false });
      const { result } = renderHook(() => useAuthForm());
      fillValidRegistration(result);

      // Act
      await act(async () => {
        await result.current.handleSubmit(false, noRedirect);
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "common.registerFailed");
    });
  });
});
