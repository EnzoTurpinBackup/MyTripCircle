import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTripMembersData } from '../useTripMembersData';
import ApiService from '../../services/ApiService';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../services/ApiService', () => ({
  __esModule: true,
  default: {
    getTripById: jest.fn(),
    getSentInvitations: jest.fn(),
    getUsersByIds: jest.fn(),
    getTripInvitationLink: jest.fn(),
  },
}));

const mockApi = ApiService as unknown as {
  getTripById: jest.Mock;
  getSentInvitations: jest.Mock;
  getUsersByIds: jest.Mock;
  getTripInvitationLink: jest.Mock;
};

const makeTripData = (overrides: Record<string, unknown> = {}) => ({
  _id: 'trip1',
  title: 'Week-end à Rome',
  ownerId: 'owner1',
  collaborators: [{ userId: 'user1', role: 'editor' }],
  ...overrides,
});

const renderLoaded = async (userId: string | undefined = 'me') => {
  const view = renderHook(() => useTripMembersData('trip1', userId));
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
};

/**
 * Variante sans `waitFor` : celui-ci fait avancer les timers simulés, ce qui
 * fausserait toute date calculée à partir de l'horloge pendant le chargement.
 */
const renderLoadedWithoutTimerAdvance = async () => {
  const view = renderHook(() => useTripMembersData('trip1', 'me'));
  await act(async () => {});
  await act(async () => {});
  await act(async () => {});
  return view;
};

describe('useTripMembersData', () => {
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockApi.getTripById.mockResolvedValue(makeTripData());
    mockApi.getSentInvitations.mockResolvedValue([]);
    mockApi.getUsersByIds.mockResolvedValue([]);
    mockApi.getTripInvitationLink.mockResolvedValue({ link: 'https://mtc.app/join/abc' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should expose the trip title once the data is loaded', async () => {
    const { result } = await renderLoaded();

    expect(mockApi.getTripById).toHaveBeenCalledWith('trip1');
    expect(result.current.tripTitle).toBe('Week-end à Rome');
  });

  it('should fall back to an empty title when the trip has none', async () => {
    mockApi.getTripById.mockResolvedValue(makeTripData({ title: undefined }));

    const { result } = await renderLoaded();

    expect(result.current.tripTitle).toBe('');
  });

  it('should stop loading without any member when the trip is not found', async () => {
    mockApi.getTripById.mockResolvedValue(null);

    const { result } = await renderLoaded();

    expect(result.current.owner).toBeNull();
    expect(result.current.activeMembers).toEqual([]);
    expect(mockApi.getUsersByIds).not.toHaveBeenCalled();
  });

  it('should resolve the owner profile from the fetched users', async () => {
    mockApi.getUsersByIds.mockResolvedValue([
      { _id: 'owner1', name: 'Alice', email: 'alice@mtc.app', avatar: 'avatar-1' },
    ]);

    const { result } = await renderLoaded();

    expect(mockApi.getUsersByIds).toHaveBeenCalledWith(['owner1', 'user1']);
    expect(result.current.owner).toEqual({
      userId: 'owner1',
      name: 'Alice',
      email: 'alice@mtc.app',
      avatar: 'avatar-1',
      role: 'owner',
      status: 'active',
    });
  });

  it('should index users by their id when they carry no _id', async () => {
    mockApi.getUsersByIds.mockResolvedValue([{ id: 'owner1', name: 'Alice' }]);

    const { result } = await renderLoaded();

    expect(result.current.owner?.name).toBe('Alice');
    expect(result.current.owner?.avatar).toBeNull();
  });

  it('should fall back to a placeholder name when the owner profile is missing', async () => {
    mockApi.getUsersByIds.mockResolvedValue([]);

    const { result } = await renderLoaded();

    expect(result.current.owner?.name).toBe('tripMembers.ownerFallback');
  });

  it('should warn without failing when the user profiles cannot be fetched', async () => {
    mockApi.getUsersByIds.mockRejectedValue(new Error('boom'));

    const { result } = await renderLoaded();

    expect(warnSpy).toHaveBeenCalledWith(
      '[useTripMembersData] Erreur chargement utilisateurs:',
      expect.any(Error)
    );
    expect(result.current.owner?.name).toBe('tripMembers.ownerFallback');
  });

  it('should stay silent about the user fetch failure outside development', async () => {
    const originalDev = (global as unknown as { __DEV__: boolean }).__DEV__;
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
    mockApi.getUsersByIds.mockRejectedValue(new Error('boom'));

    await renderLoaded();

    expect(warnSpy).not.toHaveBeenCalled();
    (global as unknown as { __DEV__: boolean }).__DEV__ = originalDev;
  });

  it('should skip the user fetch when the trip has neither owner nor collaborators', async () => {
    mockApi.getTripById.mockResolvedValue(makeTripData({ ownerId: '', collaborators: undefined }));

    const { result } = await renderLoaded();

    expect(mockApi.getUsersByIds).not.toHaveBeenCalled();
    expect(result.current.activeMembers).toEqual([]);
  });

  it('should map collaborators with their resolved profile', async () => {
    mockApi.getUsersByIds.mockResolvedValue([
      { _id: 'user1', name: 'Bob', email: 'bob@mtc.app', avatar: 'avatar-2' },
    ]);

    const { result } = await renderLoaded();

    expect(result.current.activeMembers).toEqual([
      {
        userId: 'user1',
        name: 'Bob',
        email: 'bob@mtc.app',
        avatar: 'avatar-2',
        role: 'editor',
        status: 'active',
      },
    ]);
  });

  it('should fall back to the user id and the viewer role for an unresolved collaborator', async () => {
    mockApi.getTripById.mockResolvedValue(makeTripData({ collaborators: [{ userId: 'ghost' }] }));

    const { result } = await renderLoaded();

    expect(result.current.activeMembers).toEqual([
      {
        userId: 'ghost',
        name: 'ghost',
        email: undefined,
        avatar: null,
        role: 'viewer',
        status: 'active',
      },
    ]);
  });

  it('should not fetch sent invitations when no user id is provided', async () => {
    const view = renderHook(() => useTripMembersData('trip1', undefined));
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    const { result } = view;

    expect(mockApi.getSentInvitations).not.toHaveBeenCalled();
    expect(result.current.pendingMembers).toEqual([]);
  });

  it('should map the pending invitations that belong to the trip', async () => {
    mockApi.getSentInvitations.mockResolvedValue([
      {
        _id: 'inv1',
        tripId: 'trip1',
        inviteeEmail: 'carol@mtc.app',
        createdAt: '2025-03-01T10:00:00.000Z',
      },
      { _id: 'inv2', tripId: 'other-trip', inviteeEmail: 'dave@mtc.app' },
    ]);

    const { result } = await renderLoaded();

    expect(mockApi.getSentInvitations).toHaveBeenCalledWith('me', 'pending');
    expect(result.current.pendingMembers).toEqual([
      {
        userId: 'inv1',
        name: 'carol@mtc.app',
        email: 'carol@mtc.app',
        role: 'viewer',
        status: 'pending',
        invitedAt: new Date('2025-03-01T10:00:00.000Z'),
        invitationId: 'inv1',
      },
    ]);
  });

  it('should name a pending invitation after its phone number when it has no email', async () => {
    mockApi.getSentInvitations.mockResolvedValue([
      { id: 'inv3', tripId: 'trip1', inviteePhone: '+33600000000' },
    ]);

    const { result } = await renderLoaded();

    expect(result.current.pendingMembers[0]).toEqual({
      userId: 'inv3',
      name: '+33600000000',
      email: undefined,
      role: 'viewer',
      status: 'pending',
      invitedAt: undefined,
      invitationId: 'inv3',
    });
  });

  it('should use the guest placeholder when the invitation has no contact detail', async () => {
    mockApi.getSentInvitations.mockResolvedValue([{ _id: 'inv4', tripId: 'trip1' }]);

    const { result } = await renderLoaded();

    expect(result.current.pendingMembers[0].name).toBe('tripMembers.guestFallback');
  });

  it('should ignore an invitation fetch failure', async () => {
    mockApi.getSentInvitations.mockRejectedValue(new Error('boom'));

    const { result } = await renderLoaded();

    expect(result.current.pendingMembers).toEqual([]);
    expect(result.current.tripTitle).toBe('Week-end à Rome');
  });

  it('should expose the invitation link with a seven day expiry', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-03-10T12:00:00Z'));

    const { result } = await renderLoadedWithoutTimerAdvance();

    expect(result.current.inviteLink).toBe('https://mtc.app/join/abc');
    expect(result.current.linkExpiry).toEqual(new Date('2025-03-17T12:00:00Z'));
  });

  it('should expose an empty invitation link when the api returns none', async () => {
    mockApi.getTripInvitationLink.mockResolvedValue({});

    const { result } = await renderLoaded();

    expect(result.current.inviteLink).toBe('');
  });

  it('should warn and keep an empty link when the invitation link cannot be fetched', async () => {
    mockApi.getTripInvitationLink.mockRejectedValue(new Error('boom'));

    const { result } = await renderLoaded();

    expect(warnSpy).toHaveBeenCalledWith(
      '[useTripMembersData] Erreur chargement lien invitation:',
      expect.any(Error)
    );
    expect(result.current.inviteLink).toBe('');
    expect(result.current.linkExpiry).toBeNull();
  });

  it('should stay silent about the invitation link failure outside development', async () => {
    const originalDev = (global as unknown as { __DEV__: boolean }).__DEV__;
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
    mockApi.getTripInvitationLink.mockRejectedValue(new Error('boom'));

    await renderLoaded();

    expect(warnSpy).not.toHaveBeenCalled();
    (global as unknown as { __DEV__: boolean }).__DEV__ = originalDev;
  });

  it('should log the error and stop loading when the trip fetch fails', async () => {
    mockApi.getTripById.mockRejectedValue(new Error('boom'));

    const { result } = await renderLoaded();

    expect(errorSpy).toHaveBeenCalledWith('useTripMembersData loadData:', expect.any(Error));
    expect(result.current.owner).toBeNull();
  });

  it('should reload the data and clear the refreshing flag on pull to refresh', async () => {
    const { result } = await renderLoaded();
    mockApi.getTripById.mockClear();

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(mockApi.getTripById).toHaveBeenCalledTimes(1);
    expect(result.current.refreshing).toBe(false);
  });

  it('should expose setters to override the invitation link locally', async () => {
    const { result } = await renderLoaded();

    act(() => {
      result.current.setInviteLink('https://mtc.app/join/renewed');
      result.current.setLinkExpiry(new Date('2025-04-01T00:00:00.000Z'));
    });

    expect(result.current.inviteLink).toBe('https://mtc.app/join/renewed');
    expect(result.current.linkExpiry).toEqual(new Date('2025-04-01T00:00:00.000Z'));
  });
});
