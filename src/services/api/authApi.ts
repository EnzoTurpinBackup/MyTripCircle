import { request } from "./apiCore";

export const authApi = {
  login: (data: { email: string; password: string }) =>
    request<{
      success: boolean;
      token?: string;
      refreshToken?: string;
      user?: any;
      requiresOtp?: boolean;
      userId?: string;
      error?: string;
    }>("/users/login", "POST", data),

  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    request<{
      success: boolean;
      token?: string;
      refreshToken?: string;
      user?: any;
      userId?: string;
      error?: string;
      requiresOtp?: boolean;
    }>("/users/register", "POST", data),

  loginWithGoogle: (data: { accessToken: string; mode: "login" | "register" }) =>
    request<{ success: boolean; token?: string; refreshToken?: string; user?: any; error?: string; isNewUser?: boolean }>(
      "/users/google", "POST", data
    ),

  loginWithApple: (data: {
    identityToken: string;
    email?: string;
    fullName?: { givenName?: string | null; familyName?: string | null } | null;
    mode: "login" | "register";
  }) =>
    request<{ success: boolean; token?: string; refreshToken?: string; user?: any; error?: string; isNewUser?: boolean }>(
      "/users/apple", "POST", data
    ),

  verifyOtp: (data: { userId: string; otp: string }) =>
    request<{ success: boolean; token?: string; refreshToken?: string; user?: any; error?: string }>(
      "/users/verify-otp", "POST", data
    ),

  logout: (data: { refreshToken: string }) =>
    request<{ success: boolean }>("/users/logout", "POST", data),

  resendOtp: (userId: string) =>
    request<{ success: boolean }>("/users/resend-otp", "POST", { userId }),

  requestPasswordReset: (email: string) =>
    request<{ success: boolean; message?: string }>("/users/forgot-password", "POST", { email }),

  verifyResetToken: (code: string) =>
    request<{ success: boolean; error?: string }>(
      `/users/verify-reset-token?code=${encodeURIComponent(code)}`
    ),

  resetPassword: (code: string, newPassword: string) =>
    request<{ success: boolean; token?: string; user?: any }>(
      "/users/reset-password", "POST", { code, newPassword }
    ),

  lookupUser: (params: { email?: string; phone?: string }) => {
    const qs = params.email
      ? `email=${encodeURIComponent(params.email)}`
      : `phone=${encodeURIComponent(params.phone!)}`;
    return request<any>(`/users/lookup?${qs}`);
  },

  getUsersByIds: (ids: string[]) =>
    request<any[]>("/users/batch", "POST", { ids }),
};
