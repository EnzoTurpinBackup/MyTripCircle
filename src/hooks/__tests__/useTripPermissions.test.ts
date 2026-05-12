import { renderHook, waitFor } from '@testing-library/react-native';
import { useTripPermissions } from '../useTripPermissions';
import type { Trip, Booking } from '../../types';
import ApiService from '../../services/ApiService';

jest.mock('../../services/ApiService', () => ({
  __esModule: true,
  default: {
    getUsersByIds: jest.fn().mockResolvedValue([]),
  },
}));

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip1',
  title: 'Test Trip',
  destination: 'Paris',
  ownerId: 'owner1',
  collaborators: [],
  isPublic: false,
  visibility: 'private',
  status: 'draft',
  stats: { totalBookings: 0, totalAddresses: 0, totalCollaborators: 0 },
  location: { type: 'Point', coordinates: [0, 0] },
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-10'),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeBooking = (price: number): Booking => ({
  id: 'b1',
  tripId: 'trip1',
  type: 'flight',
  title: 'Flight',
  date: new Date(),
  status: 'confirmed',
  price,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('useTripPermissions', () => {
  beforeEach(() => {
    (ApiService.getUsersByIds as jest.Mock).mockReset();
    (ApiService.getUsersByIds as jest.Mock).mockResolvedValue([]);
  });

  // getUsersByIds est appelé de manière asynchrone dans un useEffect.
  // React 19 émet un avertissement "not wrapped in act" quand le setState
  // qui suit la résolution de la promesse s'exécute après la fin de l'act
  // initial. On le supprime ici car il est sans impact sur les assertions.
  let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

  beforeAll(() => {
    const orig = console.error;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((msg: unknown, ...rest: unknown[]) => {
      if (typeof msg === 'string' && msg.includes('not wrapped in act')) return;
      orig.apply(console, [msg, ...rest] as Parameters<typeof console.error>);
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should set isOwner to true when userId matches ownerId', () => {
    const { result } = renderHook(() =>
      useTripPermissions(makeTrip({ ownerId: 'user1' }), [], 'user1')
    );
    expect(result.current.isOwner).toBe(true);
  });

  it('should set isOwner to false when userId differs from ownerId', () => {
    const { result } = renderHook(() =>
      useTripPermissions(makeTrip({ ownerId: 'owner1' }), [], 'user2')
    );
    expect(result.current.isOwner).toBe(false);
  });

  it('should set isOwner to false when trip is null', () => {
    const { result } = renderHook(() => useTripPermissions(null, [], 'user1'));
    expect(result.current.isOwner).toBe(false);
  });

  it('should grant canInvite to the owner', () => {
    const { result } = renderHook(() =>
      useTripPermissions(makeTrip({ ownerId: 'user1' }), [], 'user1')
    );
    expect(result.current.canInvite).toBeTruthy();
  });

  it('should grant canInvite to a collaborator with the permission', () => {
    const trip = makeTrip({
      collaborators: [
        {
          userId: 'collab1',
          role: 'editor',
          joinedAt: new Date(),
          permissions: { canEdit: true, canInvite: true, canDelete: false },
        },
      ],
    });
    const { result } = renderHook(() => useTripPermissions(trip, [], 'collab1'));
    expect(result.current.canInvite).toBeTruthy();
  });

  it('should deny canInvite to a collaborator without the permission', () => {
    const trip = makeTrip({
      collaborators: [
        {
          userId: 'collab2',
          role: 'viewer',
          joinedAt: new Date(),
          permissions: { canEdit: false, canInvite: false, canDelete: false },
        },
      ],
    });
    const { result } = renderHook(() => useTripPermissions(trip, [], 'collab2'));
    expect(result.current.canInvite).toBeFalsy();
  });

  it('should compute totalMembers as collaborators.length + 1 (owner)', () => {
    const trip = makeTrip({
      collaborators: [
        { userId: 'c1', role: 'viewer', joinedAt: new Date(), permissions: { canEdit: false, canInvite: false, canDelete: false } },
        { userId: 'c2', role: 'viewer', joinedAt: new Date(), permissions: { canEdit: false, canInvite: false, canDelete: false } },
      ],
    });
    const { result } = renderHook(() => useTripPermissions(trip, [], 'owner1'));
    expect(result.current.totalMembers).toBe(3);
  });

  it('should return 0 totalMembers when trip is null', () => {
    const { result } = renderHook(() => useTripPermissions(null, [], 'user1'));
    expect(result.current.totalMembers).toBe(0);
  });

  it('should compute totalBudget as sum of booking prices', () => {
    const bookings = [makeBooking(200), makeBooking(350), makeBooking(50)];
    const { result } = renderHook(() => useTripPermissions(makeTrip(), bookings, 'owner1'));
    expect(result.current.totalBudget).toBe(600);
  });

  it('should return 0 totalBudget for bookings without price', () => {
    const bookings = [makeBooking(0), { ...makeBooking(0), price: undefined }];
    const { result } = renderHook(() => useTripPermissions(makeTrip(), bookings, 'owner1'));
    expect(result.current.totalBudget).toBe(0);
  });

  it('should map collaborator users using _id.toString or id', async () => {
    (ApiService.getUsersByIds as jest.Mock).mockResolvedValueOnce([
      { _id: { toString: () => 'mongo-user' }, name: 'Mongo' },
      { id: 'plain-id', name: 'Plain' },
    ]);

    const trip = makeTrip({
      ownerId: 'owner-x',
      collaborators: [
        {
          userId: 'mongo-user',
          role: 'viewer',
          joinedAt: new Date(),
          permissions: { canEdit: false, canInvite: false, canDelete: false },
        },
        {
          userId: 'plain-id',
          role: 'viewer',
          joinedAt: new Date(),
          permissions: { canEdit: false, canInvite: false, canDelete: false },
        },
      ],
    });

    const { result } = renderHook(() => useTripPermissions(trip, [], 'viewer-self'));

    await waitFor(() => {
      expect(result.current.collaboratorUsers.size).toBe(2);
    });
    expect(result.current.collaboratorUsers.get('mongo-user')).toMatchObject({ name: 'Mongo' });
    expect(result.current.collaboratorUsers.get('plain-id')).toMatchObject({ name: 'Plain' });
  });

  it('should fetch invitedBy when it differs from the current user', async () => {
    (ApiService.getUsersByIds as jest.Mock).mockResolvedValueOnce([
      { id: 'inviter1', name: 'Inviter' },
      { id: 'owner1', name: 'Owner' },
    ]);

    const trip = makeTrip({
      ownerId: 'owner1',
      collaborators: [
        {
          userId: 'c1',
          role: 'viewer',
          joinedAt: new Date(),
          permissions: { canEdit: false, canInvite: false, canDelete: false },
          invitedBy: 'inviter1',
        },
      ],
    });

    const { result } = renderHook(() => useTripPermissions(trip, [], 'c1'));

    await waitFor(() => {
      expect(result.current.collaboratorUsers.get('inviter1')).toMatchObject({ name: 'Inviter' });
    });
    expect(ApiService.getUsersByIds).toHaveBeenCalledWith(
      expect.arrayContaining(['inviter1', 'owner1']),
    );
  });

  it('should not iterate collaborators when the array is undefined', async () => {
    const trip = { ...makeTrip({ ownerId: 'solo-owner' }), collaborators: undefined as unknown as Trip['collaborators'] };
    (ApiService.getUsersByIds as jest.Mock).mockResolvedValueOnce([{ id: 'solo-owner', name: 'Owner' }]);

    const { result } = renderHook(() => useTripPermissions(trip, [], 'viewer'));

    expect(result.current.totalMembers).toBe(1);

    await waitFor(() => {
      expect(result.current.collaboratorUsers.has('solo-owner')).toBe(true);
    });
    expect(ApiService.getUsersByIds).toHaveBeenCalledWith(['solo-owner']);
  });

  it('should log and ignore errors when collaborator fetch fails', async () => {
    (ApiService.getUsersByIds as jest.Mock).mockRejectedValueOnce(new Error('network'));

    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const trip = makeTrip({
      ownerId: 'other-owner',
      collaborators: [
        {
          userId: 'c1',
          role: 'viewer',
          joinedAt: new Date(),
          permissions: { canEdit: false, canInvite: false, canDelete: false },
        },
      ],
    });

    renderHook(() => useTripPermissions(trip, [], 'viewer-self'));

    await waitFor(() => {
      expect(ApiService.getUsersByIds).toHaveBeenCalled();
    });

    expect(errSpy).toHaveBeenCalledWith('Error loading collaborator info:', expect.any(Error));
    errSpy.mockRestore();
  });
});
