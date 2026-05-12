import { invitationsApi } from '../invitationsApi';

jest.mock('../apiCore', () => ({
  request: jest.fn(),
}));

import { request } from '../apiCore';

const mockRequest = request as jest.Mock;

describe('invitationsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue({});
  });

  it('createInvitation — should call POST /invitations with the invitation payload', async () => {
    const invitation = {
      tripId: 'trip1',
      inviteeEmail: 'guest@test.com',
      message: 'Rejoins-nous !',
    };
    await invitationsApi.createInvitation(invitation);
    expect(mockRequest).toHaveBeenCalledWith('/invitations', 'POST', invitation);
  });

  it('getUserInvitations — should call GET /invitations/user/:email without query when status omitted', async () => {
    await invitationsApi.getUserInvitations('user@test.com');
    expect(mockRequest).toHaveBeenCalledWith('/invitations/user/user@test.com');
  });

  it('getUserInvitations — should append status query param when provided', async () => {
    await invitationsApi.getUserInvitations('user@test.com', 'pending');
    expect(mockRequest).toHaveBeenCalledWith('/invitations/user/user@test.com?status=pending');
  });

  it('getSentInvitations — should call GET /invitations/sent without query when status omitted', async () => {
    await invitationsApi.getSentInvitations('user1');
    expect(mockRequest).toHaveBeenCalledWith('/invitations/sent');
  });

  it('getSentInvitations — should append status query param when provided', async () => {
    await invitationsApi.getSentInvitations('user1', 'accepted');
    expect(mockRequest).toHaveBeenCalledWith('/invitations/sent?status=accepted');
  });

  it('getInvitationByToken — should call GET /invitations/token/:token', async () => {
    await invitationsApi.getInvitationByToken('tok123');
    expect(mockRequest).toHaveBeenCalledWith('/invitations/token/tok123');
  });

  it('respondToInvitation — should call PUT /invitations/:token with action and userId', async () => {
    await invitationsApi.respondToInvitation('tok123', 'accept', 'user1');
    expect(mockRequest).toHaveBeenCalledWith('/invitations/tok123', 'PUT', {
      action: 'accept',
      userId: 'user1',
    });
  });

  it('getTripInvitationLink — should call POST /invitations/trip-link/:tripId with force=false by default', async () => {
    await invitationsApi.getTripInvitationLink('trip1');
    expect(mockRequest).toHaveBeenCalledWith('/invitations/trip-link/trip1', 'POST', { force: false });
  });

  it('getTripInvitationLink — should forward force=true when requested', async () => {
    await invitationsApi.getTripInvitationLink('trip1', true);
    expect(mockRequest).toHaveBeenCalledWith('/invitations/trip-link/trip1', 'POST', { force: true });
  });

  it('cancelInvitation — should call DELETE /invitations/:id', async () => {
    await invitationsApi.cancelInvitation('inv1');
    expect(mockRequest).toHaveBeenCalledWith('/invitations/inv1', 'DELETE');
  });
});
