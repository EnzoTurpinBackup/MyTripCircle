import { moderationApi } from '../moderationApi';

jest.mock('../apiCore', () => ({
  request: jest.fn(),
}));

import { request } from '../apiCore';

const mockRequest = request as jest.Mock;

describe('moderationApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue({ success: true });
  });

  it('reportUser — should call POST /moderation/report with targetType "user"', async () => {
    await moderationApi.reportUser('user1', 'spam');
    expect(mockRequest).toHaveBeenCalledWith('/moderation/report', 'POST', {
      targetType: 'user',
      targetId: 'user1',
      reason: 'spam',
    });
  });

  it('reportTrip — should call POST /moderation/report with targetType "trip"', async () => {
    await moderationApi.reportTrip('trip1', 'inappropriate');
    expect(mockRequest).toHaveBeenCalledWith('/moderation/report', 'POST', {
      targetType: 'trip',
      targetId: 'trip1',
      reason: 'inappropriate',
    });
  });

  it('blockUser — should call POST /moderation/block/:userId', async () => {
    await moderationApi.blockUser('user1');
    expect(mockRequest).toHaveBeenCalledWith('/moderation/block/user1', 'POST');
  });

  it('unblockUser — should call DELETE /moderation/block/:userId', async () => {
    await moderationApi.unblockUser('user1');
    expect(mockRequest).toHaveBeenCalledWith('/moderation/block/user1', 'DELETE');
  });
});
