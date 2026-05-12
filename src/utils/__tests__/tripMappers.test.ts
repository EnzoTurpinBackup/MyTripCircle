import {
  mapCollaborator,
  mapTrip,
  mapTripFromCreate,
  mapBooking,
  mapAddress,
  mapInvitation,
  mapInvitationWithExtras,
} from '../tripMappers';

describe('mapCollaborator', () => {
  it('should create collaborator from string userId with viewer role by default', () => {
    const result = mapCollaborator('user123');
    expect(result.userId).toBe('user123');
    expect(result.role).toBe('viewer');
    expect(result.permissions.canEdit).toBe(false);
    expect(result.permissions.canInvite).toBe(false);
    expect(result.permissions.canDelete).toBe(false);
    expect(result.joinedAt).toBeInstanceOf(Date);
  });

  it('should set canEdit to true when string input uses editor role', () => {
    const result = mapCollaborator('user123', 'editor');
    expect(result.role).toBe('editor');
    expect(result.permissions.canEdit).toBe(true);
  });

  it('should map collaborator from full object', () => {
    const raw = {
      userId: 'user456',
      role: 'editor',
      joinedAt: '2024-01-15T10:00:00Z',
      permissions: { canEdit: true, canInvite: true, canDelete: false },
      invitedBy: 'owner1',
    };
    const result = mapCollaborator(raw);
    expect(result.userId).toBe('user456');
    expect(result.role).toBe('editor');
    expect(result.joinedAt).toBeInstanceOf(Date);
    expect(result.permissions.canInvite).toBe(true);
    expect(result.invitedBy).toBe('owner1');
  });

  it('should apply viewer defaults when object has no role or permissions', () => {
    const result = mapCollaborator({ userId: 'u1' });
    expect(result.role).toBe('viewer');
    expect(result.permissions.canEdit).toBe(false);
  });

  it('should fall back to the raw object when userId is missing', () => {
    const raw = { role: 'viewer', joinedAt: new Date() } as any;
    const result = mapCollaborator(raw);
    expect(result.userId).toBe(raw);
  });
});

describe('mapTrip', () => {
  const RAW_TRIP = {
    _id: 'trip123',
    title: 'Tokyo Trip',
    description: 'Amazing trip',
    destination: 'Tokyo',
    ownerId: 'owner1',
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-15T00:00:00Z',
    collaborators: [],
    isPublic: true,
    visibility: 'public',
    status: 'validated',
    stats: { totalBookings: 5, totalAddresses: 3, totalCollaborators: 2 },
    location: { type: 'Point', coordinates: [139.69, 35.68] },
    tags: ['culture'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  };

  it('should use _id when present', () => {
    expect(mapTrip(RAW_TRIP).id).toBe('trip123');
  });

  it('should fall back to id when _id is absent', () => {
    expect(mapTrip({ ...RAW_TRIP, _id: undefined, id: 'trip456' }).id).toBe('trip456');
  });

  it('should convert string dates to Date objects', () => {
    const result = mapTrip(RAW_TRIP);
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should apply default stats when missing', () => {
    const result = mapTrip({ ...RAW_TRIP, stats: undefined });
    expect(result.stats).toEqual({ totalBookings: 0, totalAddresses: 0, totalCollaborators: 0 });
  });

  it('should apply draft status by default', () => {
    expect(mapTrip({ ...RAW_TRIP, status: undefined }).status).toBe('draft');
  });

  it('should derive visibility from isPublic when not provided', () => {
    expect(mapTrip({ ...RAW_TRIP, visibility: undefined, isPublic: true }).visibility).toBe('public');
    expect(mapTrip({ ...RAW_TRIP, visibility: undefined, isPublic: false }).visibility).toBe('private');
  });

  it('should map collaborator strings to objects', () => {
    const result = mapTrip({ ...RAW_TRIP, collaborators: ['user1', 'user2'] });
    expect(result.collaborators).toHaveLength(2);
    expect(result.collaborators[0].userId).toBe('user1');
  });

  it('should default to empty arrays and zero-coordinate location when absent', () => {
    const result = mapTrip({ ...RAW_TRIP, tags: undefined, location: undefined, collaborators: undefined });
    expect(result.tags).toEqual([]);
    expect(result.collaborators).toEqual([]);
    expect(result.location).toEqual({ type: 'Point', coordinates: [0, 0] });
  });
});

describe('mapTripFromCreate', () => {
  it('should assign editor role to collaborators', () => {
    const raw = {
      _id: 'trip1',
      title: 'Trip',
      destination: 'Paris',
      ownerId: 'owner1',
      collaborators: ['user1'],
      isPublic: false,
    };
    const result = mapTripFromCreate(raw);
    expect(result.collaborators[0].role).toBe('editor');
    expect(result.collaborators[0].permissions.canEdit).toBe(true);
  });

  it('should default collaborators to an empty array when absent', () => {
    const raw = {
      _id: 'trip2',
      title: 'Solo',
      destination: 'Lyon',
      ownerId: 'owner1',
      isPublic: false,
    };
    expect(mapTripFromCreate(raw).collaborators).toEqual([]);
  });
});

describe('mapBooking', () => {
  const RAW_BOOKING = {
    _id: 'book1',
    tripId: 'trip1',
    type: 'flight',
    title: 'CDG → NRT',
    date: '2024-06-01T08:00:00Z',
    status: 'confirmed',
    price: 850,
    currency: 'JPY',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('should map all booking fields', () => {
    const result = mapBooking(RAW_BOOKING);
    expect(result.id).toBe('book1');
    expect(result.type).toBe('flight');
    expect(result.price).toBe(850);
    expect(result.currency).toBe('JPY');
    expect(result.date).toBeInstanceOf(Date);
  });

  it('should default currency to EUR', () => {
    expect(mapBooking({ ...RAW_BOOKING, currency: undefined }).currency).toBe('EUR');
  });

  it('should default status to pending', () => {
    expect(mapBooking({ ...RAW_BOOKING, status: undefined }).status).toBe('pending');
  });

  it('should map optional endDate to Date when present', () => {
    const result = mapBooking({ ...RAW_BOOKING, endDate: '2024-06-10T00:00:00Z' });
    expect(result.endDate).toBeInstanceOf(Date);
  });

  it('should leave endDate undefined when not provided', () => {
    expect(mapBooking({ ...RAW_BOOKING, endDate: undefined }).endDate).toBeUndefined();
  });

  it('should fall back to id when _id is missing and default tripId to empty string', () => {
    const result = mapBooking({
      id: 'book-id',
      type: 'hotel',
      title: 'Stay',
      date: '2024-06-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    } as any);
    expect(result.id).toBe('book-id');
    expect(result.tripId).toBe('');
  });

  it('should map optional description, time, address and confirmationNumber', () => {
    const result = mapBooking({
      ...RAW_BOOKING,
      description: 'Note',
      time: '14:00',
      address: '1 rue de Paris',
      confirmationNumber: 'ABC123',
    });
    expect(result.description).toBe('Note');
    expect(result.time).toBe('14:00');
    expect(result.address).toBe('1 rue de Paris');
    expect(result.confirmationNumber).toBe('ABC123');
  });

  it('should default date to now when raw.date is missing', () => {
    const { date, ...rest } = RAW_BOOKING as any;
    const result = mapBooking({ ...rest, date: undefined });
    expect(result.date).toBeInstanceOf(Date);
  });

  it('should default createdAt and updatedAt when missing on booking', () => {
    const { createdAt, updatedAt, ...rest } = RAW_BOOKING as any;
    const result = mapBooking({ ...rest, createdAt: undefined, updatedAt: undefined });
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });
});

describe('mapAddress', () => {
  const RAW_ADDRESS = {
    _id: 'addr1',
    type: 'hotel',
    name: 'Hotel Keio',
    address: '1-1 Shinjuku',
    city: 'Tokyo',
    country: 'Japan',
    rating: 4.5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('should map all address fields', () => {
    const result = mapAddress(RAW_ADDRESS);
    expect(result.id).toBe('addr1');
    expect(result.name).toBe('Hotel Keio');
    expect(result.rating).toBe(4.5);
  });

  it('should set rating to undefined when not a number', () => {
    expect(mapAddress({ ...RAW_ADDRESS, rating: 'great' }).rating).toBeUndefined();
  });

  it('should include rating of 0', () => {
    expect(mapAddress({ ...RAW_ADDRESS, rating: 0 }).rating).toBe(0);
  });

  it('should fall back to id when _id is absent and map optional fields', () => {
    const result = mapAddress({
      id: 'addr2',
      type: 'restaurant',
      name: 'Café',
      address: 'Centre',
      city: 'Paris',
      country: 'France',
      phone: '0102030405',
      website: 'https://example.com',
      notes: 'Réservation',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    } as any);
    expect(result.id).toBe('addr2');
    expect(result.phone).toBe('0102030405');
    expect(result.website).toBe('https://example.com');
    expect(result.notes).toBe('Réservation');
  });

  it('should default createdAt and updatedAt when missing', () => {
    const result = mapAddress({
      _id: 'addr3',
      type: 'hotel',
      name: 'Inn',
      address: 'Main',
      city: 'Lyon',
      country: 'France',
    } as any);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });
});

describe('mapInvitation', () => {
  const RAW = {
    _id: 'inv1',
    tripId: 'trip1',
    inviterId: 'user1',
    inviteeEmail: 'guest@example.com',
    status: 'pending',
    token: 'abc123',
    expiresAt: '2024-12-31T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
  };

  it('should map invitation fields and convert dates', () => {
    const result = mapInvitation(RAW);
    expect(result.id).toBe('inv1');
    expect(result.status).toBe('pending');
    expect(result.token).toBe('abc123');
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should default trip to null when not provided', () => {
    expect(mapInvitation(RAW).trip).toBeNull();
  });

  it('should preserve embedded trip and default missing dates', () => {
    const result = mapInvitation({
      id: 'inv2',
      tripId: 'trip1',
      inviterId: 'user1',
      status: 'pending',
      token: 'tok',
      trip: { title: 'Tokyo' },
    } as any);
    expect(result.trip).toEqual({ title: 'Tokyo' });
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.createdAt).toBeInstanceOf(Date);
  });
});

describe('mapInvitationWithExtras', () => {
  it('should extend invitation with type, permissions and inviter', () => {
    const raw = {
      _id: 'inv1',
      tripId: 'trip1',
      inviterId: 'user1',
      status: 'pending',
      token: 'tok',
      expiresAt: '2024-12-31T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      type: 'friend',
      permissions: { canEdit: false },
      inviter: { name: 'Alice' },
    };
    const result = mapInvitationWithExtras(raw);
    expect(result.type).toBe('friend');
    expect(result.permissions).toEqual({ canEdit: false });
    expect(result.inviter).toEqual({ name: 'Alice' });
    expect(result.status).toBe('pending');
  });
});
