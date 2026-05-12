import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import * as secureStorage from "../utils/secureStorage";
import { User } from "../types";
import ApiService from "../services/ApiService";
import { setUnauthorizedCallback, clearUnauthorizedCallback } from "../services/api/apiCore";
import i18n, { parseApiError as translateApiMessage } from "../utils/i18n";
import { useUserProfile } from "../hooks/useUserProfile";

export type AuthField = "email" | "password" | "name" | "phone";
export type AuthResult =
  | { success: true }
  | { success: false; error: string; field?: AuthField; requiresOtp?: boolean; userId?: string };

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (
    name: string,
    email: string,
    password: string,
    phone?: string,
  ) => Promise<AuthResult & { userId?: string }>;
  loginWithGoogle: (accessToken: string, mode: "login" | "register") => Promise<AuthResult>;
  loginWithApple: (
    identityToken: string,
    email?: string,
    fullName?: { givenName?: string | null; familyName?: string | null } | null,
    mode?: "login" | "register",
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; scheduledAt?: Date }>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  updateAvatar: (avatar: string) => Promise<void>;
  updateSettings: (data: { isPublicProfile: boolean }) => Promise<void>;
  verifyOtp: (
    userId: string,
    otp: string,
  ) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<boolean>;
  loginWithToken: (token: string, user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  // Enregistre le callback de déconnexion forcée en cas de 401 (token expiré côté serveur)
  useEffect(() => {
    setUnauthorizedCallback(() => setUser(null));
    return () => clearUnauthorizedCallback();
  }, []);

  const parseApiError = (
    error: unknown,
  ): { message: string; field?: AuthField; requiresOtp?: boolean; userId?: string } => {
    const defaultMessage = i18n.t("common.unexpectedError");

    const raw = error instanceof Error ? error.message : String(error);
    try {
      const parsed = JSON.parse(raw) as {
        error?: string;
        message?: string;
        field?: AuthField;
        requiresOtp?: boolean;
        userId?: string;
      };
      const message = parsed.error || parsed.message || defaultMessage;
      return { message, field: parsed.field, requiresOtp: parsed.requiresOtp, userId: parsed.userId };
    } catch (e) {
      if (__DEV__) console.warn("[AuthContext] parseError JSON invalide:", e);
      return { message: raw || defaultMessage };
    }
  };

  const loadUser = async () => {
    try {
      const userData = await secureStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        // Convert date strings back to Date objects
        setUser({
          ...user,
          createdAt: new Date(user.createdAt),
        });
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    try {
      const res = await ApiService.login({ email, password });

      // Check if user needs to verify OTP first
      if (res && res.requiresOtp && res.userId) {
        return {
          success: false,
          error: res.error || i18n.t("common.requiresOtp"),
          requiresOtp: true,
          userId: res.userId,
        };
      }

      if (!res?.success || !res?.token || !res?.user) {
        return { success: false, error: i18n.t("common.loginFailed") };
      }

      await secureStorage.setItem("token", res.token);
      if (res.refreshToken) await secureStorage.setItem("refreshToken", res.refreshToken);
      await secureStorage.setItem("user", JSON.stringify(res.user));
      setUser({
        ...res.user,
        createdAt: new Date(res.user.createdAt),
      });
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      const parsed = parseApiError(error);
      // Check if user needs to verify OTP (from error response)
      if (parsed.requiresOtp && parsed.userId) {
        return { success: false, error: parsed.message, requiresOtp: true, userId: parsed.userId };
      }
      return { success: false, error: parsed.message, field: parsed.field };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phone?: string,
  ): Promise<AuthResult & { userId?: string }> => {
    try {
      const res = await ApiService.register({ name, email, password, phone });
      if (!res?.success) {
        if (res?.requiresOtp && res?.userId) {
          return {
            success: false,
            error: res.error || i18n.t("common.requiresOtp"),
            requiresOtp: true,
            userId: res.userId,
          };
        }
        return {
          success: false,
          error: res?.error || i18n.t("common.registerFailed"),
        };
      }

      // If OTP is required, return userId for OTP verification
      if (res.userId && !res.token) {
        return { success: true, userId: res.userId };
      }

      // If token is provided, user is already verified (no OTP flow)
      if (res.token && res.user) {
        await secureStorage.setItem("token", res.token);
        if (res.refreshToken) await secureStorage.setItem("refreshToken", res.refreshToken);
        await secureStorage.setItem("user", JSON.stringify(res.user));
        setUser({
          ...res.user,
          createdAt: new Date(res.user.createdAt),
        });
      }

      return { success: true, userId: res.userId };
    } catch (error) {
      console.error("Registration error:", error);
      const parsed = parseApiError(error);
      if (parsed.requiresOtp && parsed.userId) {
        return { success: false, error: parsed.message, requiresOtp: true, userId: parsed.userId };
      }
      return { success: false, error: parsed.message, field: parsed.field };
    }
  };

  const loginWithGoogle = async (accessToken: string, mode: "login" | "register" = "register"): Promise<AuthResult> => {
    try {
      const res = await ApiService.loginWithGoogle({ accessToken, mode });
      if (!res?.success || !res?.token || !res?.user) {
        return {
          success: false,
          error: res?.error || i18n.t("apiErrors.googleAuthFailed"),
        };
      }
      await secureStorage.setItem("token", res.token);
      if (res.refreshToken) await secureStorage.setItem("refreshToken", res.refreshToken);
      await secureStorage.setItem("user", JSON.stringify(res.user));
      setUser({ ...res.user, createdAt: new Date(res.user.createdAt) });
      return { success: true };
    } catch (error) {
      console.error("Google login error:", error);
      const parsed = parseApiError(error);
      return { success: false, error: parsed.message };
    }
  };

  const loginWithApple = async (
    identityToken: string,
    email?: string,
    fullName?: { givenName?: string | null; familyName?: string | null } | null,
    mode: "login" | "register" = "register",
  ): Promise<AuthResult> => {
    try {
      const res = await ApiService.loginWithApple({ identityToken, email, fullName, mode });
      if (!res?.success || !res?.token || !res?.user) {
        return {
          success: false,
          error: res?.error || i18n.t("apiErrors.appleAuthFailed"),
        };
      }
      await secureStorage.setItem("token", res.token);
      if (res.refreshToken) await secureStorage.setItem("refreshToken", res.refreshToken);
      await secureStorage.setItem("user", JSON.stringify(res.user));
      setUser({ ...res.user, createdAt: new Date(res.user.createdAt) });
      return { success: true };
    } catch (error) {
      console.error("Apple login error:", error);
      const parsed = parseApiError(error);
      return { success: false, error: parsed.message };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const refreshToken = await secureStorage.getItem("refreshToken");
      // Révoque le refresh token côté serveur (best-effort, pas bloquant)
      if (refreshToken) {
        ApiService.logout({ refreshToken }).catch(() => {});
      }
      await secureStorage.multiRemove(["token", "refreshToken", "user"]);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const { updateUser, updateAvatar, updateSettings } = useUserProfile({ onUserUpdated: setUser });

  const verifyOtp = async (
    userId: string,
    otp: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await ApiService.verifyOtp({ userId, otp });
      if (!res?.success) {
        return {
          success: false,
          error: res?.error || i18n.t("otp.genericVerifyError"),
        };
      }

      if (res.token && res.user) {
        await secureStorage.setItem("token", res.token);
        if (res.refreshToken) await secureStorage.setItem("refreshToken", res.refreshToken);
        await secureStorage.setItem("user", JSON.stringify(res.user));
        setUser({
          ...res.user,
          createdAt: new Date(res.user.createdAt),
        });
      }

      return { success: true };
    } catch (error) {
      console.error("OTP verification error:", error);
      return { success: false, error: translateApiMessage(error) };
    }
  };

  const loginWithToken = async (token: string, user: User): Promise<void> => {
    await secureStorage.setItem("token", token);
    await secureStorage.setItem("user", JSON.stringify(user));
    setUser({ ...user, createdAt: new Date(user.createdAt) });
  };

  const deleteAccount = async (): Promise<{ success: boolean; scheduledAt?: Date }> => {
    try {
      const res = await ApiService.deleteAccount() as any;
      // La suppression est planifiée (soft delete 7 jours) : on déconnecte l'utilisateur
      await secureStorage.multiRemove(["token", "refreshToken", "user"]);
      setUser(null);
      return { success: true, scheduledAt: res?.scheduledAt ? new Date(res.scheduledAt) : undefined };
    } catch (error) {
      console.error("Delete account error:", error);
      return { success: false };
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> => {
    try {
      const res = await ApiService.changePassword({
        currentPassword,
        newPassword,
      });

      return !!res?.success;
    } catch (error) {
      console.error("Change password error:", error);
      return false;
    }
  };

  const value: AuthContextType = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      logout,
      deleteAccount,
      updateUser,
      updateAvatar,
      updateSettings,
      changePassword,
      verifyOtp,
      loginWithToken,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
