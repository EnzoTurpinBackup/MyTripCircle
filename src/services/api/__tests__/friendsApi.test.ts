import { friendsApi } from '../friendsApi';

jest.mock('../apiCore', () => ({
  request: jest.fn(),
}));

import { request } from '../apiCore';

const mockRequest = request as jest.Mock;

describe('friendsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue({});
  });

  it('sendFriendRequest — should call POST /friends/request with recipient data', async () => {
    const data = { recipientEmail: 'friend@test.com' };
    await friendsApi.sendFriendRequest(data);
    expect(mockRequest).toHaveBeenCalledWith('/friends/request', 'POST', data);
  });

  it('getFriendRequests — should call GET /friends/requests', async () => {
    await friendsApi.getFriendRequests();
    expect(mockRequest).toHaveBeenCalledWith('/friends/requests');
  });

  it('respondToFriendRequest — should call PUT /friends/requests/:id with action', async () => {
    await friendsApi.respondToFriendRequest('req1', 'accept');
    expect(mockRequest).toHaveBeenCalledWith('/friends/requests/req1', 'PUT', { action: 'accept' });
  });

  it('cancelFriendRequest — should call DELETE /friends/requests/:id', async () => {
    await friendsApi.cancelFriendRequest('req1');
    expect(mockRequest).toHaveBeenCalledWith('/friends/requests/req1', 'DELETE');
  });

  it('getFriends — should call GET /friends', async () => {
    await friendsApi.getFriends();
    expect(mockRequest).toHaveBeenCalledWith('/friends');
  });

  it('removeFriend — should call DELETE /friends/:id', async () => {
    await friendsApi.removeFriend('friend1');
    expect(mockRequest).toHaveBeenCalledWith('/friends/friend1', 'DELETE');
  });

  it('getFriendSuggestions — should call GET /friends/suggestions', async () => {
    await friendsApi.getFriendSuggestions();
    expect(mockRequest).toHaveBeenCalledWith('/friends/suggestions');
  });

  it('getFriendProfile — should call GET /friends/:id/profile', async () => {
    await friendsApi.getFriendProfile('friend1');
    expect(mockRequest).toHaveBeenCalledWith('/friends/friend1/profile');
  });

  it('getFriendInviteLink — should call POST /friends/invite-link', async () => {
    await friendsApi.getFriendInviteLink();
    expect(mockRequest).toHaveBeenCalledWith('/friends/invite-link', 'POST');
  });

  it('getFriendInviteByToken — should call GET /friends/invite-link/:token', async () => {
    await friendsApi.getFriendInviteByToken('tok123');
    expect(mockRequest).toHaveBeenCalledWith('/friends/invite-link/tok123');
  });

  it('acceptFriendInviteLink — should call POST /friends/invite-link/:token/accept', async () => {
    await friendsApi.acceptFriendInviteLink('tok123');
    expect(mockRequest).toHaveBeenCalledWith('/friends/invite-link/tok123/accept', 'POST');
  });
});
