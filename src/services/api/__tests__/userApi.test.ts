import { userApi } from '../userApi';

jest.mock('../apiCore', () => ({
  request: jest.fn(),
}));

import { request } from '../apiCore';

const mockRequest = request as jest.Mock;

describe('userApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue({ success: true });
  });

  it('updateConsent — should call POST /users/consent with consents, version and source', async () => {
    const consents = { data: true as const, location: true, notifications: false };
    await userApi.updateConsent(consents);
    expect(mockRequest).toHaveBeenCalledWith('/users/consent', 'POST', {
      consents,
      version: '1.0',
      source: 'mobile',
    });
  });

  it('updateProfile — should call PUT /users/me with name and email', async () => {
    const data = { name: 'Alice', email: 'alice@test.com' };
    await userApi.updateProfile(data);
    expect(mockRequest).toHaveBeenCalledWith('/users/me', 'PUT', data);
  });

  it('updateSettings — should call PUT /users/settings with isPublicProfile', async () => {
    await userApi.updateSettings({ isPublicProfile: true });
    expect(mockRequest).toHaveBeenCalledWith('/users/settings', 'PUT', { isPublicProfile: true });
  });

  it('uploadAvatar — should call PUT /users/avatar wrapping the avatar string', async () => {
    await userApi.uploadAvatar('data:image/png;base64,abc');
    expect(mockRequest).toHaveBeenCalledWith('/users/avatar', 'PUT', {
      avatar: 'data:image/png;base64,abc',
    });
  });

  it('updateLanguage — should call PUT /users/language with the language code', async () => {
    await userApi.updateLanguage('fr');
    expect(mockRequest).toHaveBeenCalledWith('/users/language', 'PUT', { language: 'fr' });
  });

  it('changePassword — should call PUT /users/change-password with current and new password', async () => {
    const data = { currentPassword: 'old!1', newPassword: 'new!2' };
    await userApi.changePassword(data);
    expect(mockRequest).toHaveBeenCalledWith('/users/change-password', 'PUT', data);
  });

  it('deleteAccount — should call DELETE /users/me', async () => {
    await userApi.deleteAccount();
    expect(mockRequest).toHaveBeenCalledWith('/users/me', 'DELETE');
  });

  it('registerPushToken — should call POST /users/push-token with token and platform', async () => {
    await userApi.registerPushToken('ExponentPushToken[xxx]');
    expect(mockRequest).toHaveBeenCalledWith('/users/push-token', 'POST', {
      token: 'ExponentPushToken[xxx]',
      platform: 'expo',
    });
  });
});
