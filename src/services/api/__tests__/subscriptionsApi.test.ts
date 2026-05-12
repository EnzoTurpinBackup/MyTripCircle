import { subscriptionsApi } from '../subscriptionsApi';

jest.mock('../apiCore', () => ({
  request: jest.fn(),
}));

import { request } from '../apiCore';

const mockRequest = request as jest.Mock;

describe('subscriptionsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue({ success: true });
  });

  it('getSubscription — should call GET /subscriptions/me', async () => {
    await subscriptionsApi.getSubscription();
    expect(mockRequest).toHaveBeenCalledWith('/subscriptions/me');
  });

  it('validatePurchase — should call POST /subscriptions/validate with the receipt payload', async () => {
    const data = {
      receiptData: 'base64-receipt',
      platform: 'ios',
      productId: 'com.mytripcircle.premium.monthly',
      transactionId: 'txn-1',
    };
    await subscriptionsApi.validatePurchase(data);
    expect(mockRequest).toHaveBeenCalledWith('/subscriptions/validate', 'POST', data);
  });

  it('cancelSubscription — should call POST /subscriptions/cancel', async () => {
    await subscriptionsApi.cancelSubscription();
    expect(mockRequest).toHaveBeenCalledWith('/subscriptions/cancel', 'POST');
  });
});
