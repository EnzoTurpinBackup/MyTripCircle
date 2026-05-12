import { authApi } from '../authApi';

jest.mock('../apiCore', () => ({
  request: jest.fn(),
}));

import { request } from '../apiCore';

const mockRequest = request as jest.Mock;

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue({ success: true });
  });

  it('login — should call POST /users/login with credentials', async () => {
    await authApi.login({ email: 'user@test.com', password: 'pass123' });
    expect(mockRequest).toHaveBeenCalledWith(
      '/users/login',
      'POST',
      { email: 'user@test.com', password: 'pass123' }
    );
  });

  it('register — should call POST /users/register with user data', async () => {
    const data = { name: 'Alice', email: 'alice@test.com', password: 'pass123' };
    await authApi.register(data);
    expect(mockRequest).toHaveBeenCalledWith('/users/register', 'POST', data);
  });

  it('loginWithGoogle — should call POST /users/google with access token and mode', async () => {
    await authApi.loginWithGoogle({ accessToken: 'tok123', mode: 'login' });
    expect(mockRequest).toHaveBeenCalledWith('/users/google', 'POST', {
      accessToken: 'tok123',
      mode: 'login',
    });
  });

  it('loginWithApple — should call POST /users/apple with identity token and mode', async () => {
    const payload = {
      identityToken: 'apple-id-tok',
      email: 'user@test.com',
      fullName: { givenName: 'Jean', familyName: 'Dupont' },
      mode: 'register' as const,
    };
    await authApi.loginWithApple(payload);
    expect(mockRequest).toHaveBeenCalledWith('/users/apple', 'POST', payload);
  });

  it('verifyOtp — should call POST /users/verify-otp', async () => {
    await authApi.verifyOtp({ userId: 'u1', otp: '123456' });
    expect(mockRequest).toHaveBeenCalledWith(
      '/users/verify-otp',
      'POST',
      { userId: 'u1', otp: '123456' }
    );
  });

  it('logout — should call POST /users/logout with refresh token', async () => {
    await authApi.logout({ refreshToken: 'ref123' });
    expect(mockRequest).toHaveBeenCalledWith(
      '/users/logout',
      'POST',
      { refreshToken: 'ref123' }
    );
  });

  it('resendOtp — should call POST /users/resend-otp', async () => {
    await authApi.resendOtp('user1');
    expect(mockRequest).toHaveBeenCalledWith(
      '/users/resend-otp',
      'POST',
      { userId: 'user1' }
    );
  });

  it('requestPasswordReset — should call POST /users/forgot-password', async () => {
    await authApi.requestPasswordReset('user@test.com');
    expect(mockRequest).toHaveBeenCalledWith(
      '/users/forgot-password',
      'POST',
      { email: 'user@test.com' }
    );
  });

  it('verifyResetToken — should call GET with encoded code as query param', async () => {
    await authApi.verifyResetToken('my-code-123');
    expect(mockRequest).toHaveBeenCalledWith(
      '/users/verify-reset-token?code=my-code-123'
    );
  });

  it('resetPassword — should call POST /users/reset-password', async () => {
    await authApi.resetPassword('code123', 'newPass!1');
    expect(mockRequest).toHaveBeenCalledWith(
      '/users/reset-password',
      'POST',
      { code: 'code123', newPassword: 'newPass!1' }
    );
  });

  it('lookupUser — should build query string with email', async () => {
    await authApi.lookupUser({ email: 'user@test.com' });
    expect(mockRequest).toHaveBeenCalledWith(
      '/users/lookup?email=user%40test.com'
    );
  });

  it('lookupUser — should build query string with phone', async () => {
    await authApi.lookupUser({ phone: '+33612345678' });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.stringContaining('/users/lookup?phone=')
    );
  });

  it('getUsersByIds — should call POST /users/batch with ids array', async () => {
    await authApi.getUsersByIds(['id1', 'id2', 'id3']);
    expect(mockRequest).toHaveBeenCalledWith(
      '/users/batch',
      'POST',
      { ids: ['id1', 'id2', 'id3'] }
    );
  });
});
