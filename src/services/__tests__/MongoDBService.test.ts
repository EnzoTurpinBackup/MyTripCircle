const mockInsertOne = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockDeleteOne = jest.fn();
const mockUpdateOne = jest.fn();
const mockCountDocuments = jest.fn();
const mockToArray = jest.fn();
const mockLimit = jest.fn(() => ({ toArray: mockToArray }));
const mockSort = jest.fn(() => ({ toArray: mockToArray, limit: mockLimit }));
const mockFind = jest.fn(() => ({ toArray: mockToArray, sort: mockSort }));

const mockCollectionApi = {
  insertOne: mockInsertOne,
  findOne: mockFindOne,
  findOneAndUpdate: mockFindOneAndUpdate,
  deleteOne: mockDeleteOne,
  updateOne: mockUpdateOne,
  countDocuments: mockCountDocuments,
  find: mockFind,
};

const mockCollection = jest.fn((_name: string) => mockCollectionApi);
const mockDb = jest.fn(() => ({ collection: mockCollection }));
const mockClientConnect = jest.fn();
const mockClientClose = jest.fn();
const mockMongoClientCtor = jest.fn(() => ({
  connect: mockClientConnect,
  db: mockDb,
  close: mockClientClose,
}));

jest.mock('mongodb', () => ({ MongoClient: mockMongoClientCtor }));

import { freezeClockAt, restoreClock } from '../../components/invitations/__tests__/frozenClock';

type MongoDBServiceClass = typeof import('../MongoDBService').default;
// Le constructeur est privé : on récupère le type d'instance via `getInstance`.
type MongoDBServiceInstance = ReturnType<MongoDBServiceClass['getInstance']>;

/**
 * Le service est un singleton figé dans le registre de modules : chaque test
 * recharge donc le module pour repartir d'une instance vierge.
 */
function loadFreshServiceClass(): MongoDBServiceClass {
  let loaded!: MongoDBServiceClass;
  jest.isolateModules(() => {
    loaded = require('../MongoDBService').default;
  });
  return loaded;
}

/** Exécute un scénario avec `__DEV__` désactivé, puis restaure la valeur. */
async function withoutDevMode(scenario: () => Promise<void>): Promise<void> {
  const globals = globalThis as { __DEV__?: boolean };
  const original = globals.__DEV__;
  globals.__DEV__ = false;
  try {
    await scenario();
  } finally {
    globals.__DEV__ = original;
  }
}

const NOW = new Date('2026-03-01T08:00:00.000Z');
const CONNECTION_STRING = 'mongodb://localhost:27017';

let ServiceClass: MongoDBServiceClass;
let service: MongoDBServiceInstance;
let baseLogSpy: jest.SpyInstance;

beforeEach(async () => {
  jest.clearAllMocks();
  freezeClockAt(NOW);
  // La connexion de préparation journalise en mode développement : on la tait
  // pour ne pas polluer la sortie des tests.
  baseLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  mockClientConnect.mockResolvedValue(undefined);
  mockClientClose.mockResolvedValue(undefined);
  mockInsertOne.mockResolvedValue({ insertedId: 'generated-id' });
  ServiceClass = loadFreshServiceClass();
  service = ServiceClass.getInstance();
  await service.connect(CONNECTION_STRING);
});

afterEach(() => {
  baseLogSpy.mockRestore();
  restoreClock();
});

describe('getInstance', () => {
  it('should always return the same singleton instance', () => {
    // Arrange
    const freshClass = loadFreshServiceClass();

    // Act
    const first = freshClass.getInstance();
    const second = freshClass.getInstance();

    // Assert
    expect(second).toBe(first);
  });
});

describe('connect', () => {
  it('should open the client and register every collection on the default database', async () => {
    // Arrange — la connexion est faite dans le beforeEach

    // Assert
    expect(mockMongoClientCtor).toHaveBeenCalledWith(CONNECTION_STRING);
    expect(mockClientConnect).toHaveBeenCalledTimes(1);
    expect(mockDb).toHaveBeenCalledWith('mytripcircle');
    expect(mockCollection.mock.calls.map(([name]) => name)).toEqual([
      'users',
      'trips',
      'bookings',
      'addresses',
      'trip_invitations',
      'notifications',
      'trip_templates',
    ]);
  });

  it('should use the given database name when one is provided', async () => {
    // Arrange
    const freshService = loadFreshServiceClass().getInstance();

    // Act
    await freshService.connect(CONNECTION_STRING, 'mytripcircle_test');

    // Assert
    expect(mockDb).toHaveBeenLastCalledWith('mytripcircle_test');
  });

  it('should log the success in development', async () => {
    // Arrange
    baseLogSpy.mockClear();
    const freshService = loadFreshServiceClass().getInstance();

    // Act
    await freshService.connect(CONNECTION_STRING);

    // Assert
    expect(baseLogSpy).toHaveBeenCalledWith('MongoDB connecté avec succès');
  });

  it('should stay silent in production', async () => {
    // Arrange
    baseLogSpy.mockClear();
    const freshService = loadFreshServiceClass().getInstance();

    // Act
    await withoutDevMode(async () => {
      await freshService.connect(CONNECTION_STRING);
    });

    // Assert
    expect(baseLogSpy).not.toHaveBeenCalled();
  });

  it('should log and rethrow when the driver fails to connect', async () => {
    // Arrange
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('ECONNREFUSED');
    mockClientConnect.mockRejectedValue(failure);
    const freshService = loadFreshServiceClass().getInstance();

    // Act / Assert
    await expect(freshService.connect(CONNECTION_STRING)).rejects.toThrow('ECONNREFUSED');
    expect(errorSpy).toHaveBeenCalledWith('Erreur de connexion MongoDB:', failure);
    expect(await freshService.checkConnection()).toBe(false);
    errorSpy.mockRestore();
  });
});

describe('disconnect', () => {
  it('should close the client and log in development', async () => {
    // Arrange
    baseLogSpy.mockClear();

    // Act
    await service.disconnect();

    // Assert
    expect(mockClientClose).toHaveBeenCalledTimes(1);
    expect(baseLogSpy).toHaveBeenCalledWith('MongoDB déconnecté');
    expect(await service.checkConnection()).toBe(false);
  });

  it('should close the client without logging in production', async () => {
    // Arrange
    baseLogSpy.mockClear();

    // Act
    await withoutDevMode(async () => {
      await service.disconnect();
    });

    // Assert
    expect(mockClientClose).toHaveBeenCalledTimes(1);
    expect(baseLogSpy).not.toHaveBeenCalled();
  });

  it('should do nothing when no client was ever opened', async () => {
    // Arrange
    const freshService = loadFreshServiceClass().getInstance();

    // Act
    await freshService.disconnect();

    // Assert
    expect(mockClientClose).not.toHaveBeenCalled();
  });
});

describe('gestion des utilisateurs', () => {
  it('should insert a user stamped with the current date and the generated id', async () => {
    // Arrange
    const userData = { name: 'Enzo', email: 'enzo@example.com' };
    mockInsertOne.mockResolvedValue({ insertedId: 'user-1' });

    // Act
    const result = await service.createUser(userData);

    // Assert
    expect(mockInsertOne).toHaveBeenCalledWith({
      ...userData,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result).toEqual({ ...userData, createdAt: NOW, updatedAt: NOW, _id: 'user-1' });
  });

  it('should fetch a user by id', async () => {
    // Arrange
    mockFindOne.mockResolvedValue({ _id: 'user-1', name: 'Enzo' });

    // Act
    const result = await service.getUserById('user-1');

    // Assert
    expect(mockFindOne).toHaveBeenCalledWith({ _id: 'user-1' });
    expect(result).toEqual({ _id: 'user-1', name: 'Enzo' });
  });

  it('should fetch a user by email', async () => {
    // Arrange
    mockFindOne.mockResolvedValue(null);

    // Act
    const result = await service.getUserByEmail('inconnu@example.com');

    // Assert
    expect(mockFindOne).toHaveBeenCalledWith({ email: 'inconnu@example.com' });
    expect(result).toBeNull();
  });

  it('should update a user and refresh its updatedAt stamp', async () => {
    // Arrange
    mockFindOneAndUpdate.mockResolvedValue({ _id: 'user-1', name: 'Enzo T.' });

    // Act
    const result = await service.updateUser('user-1', { name: 'Enzo T.' });

    // Assert
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'user-1' },
      { $set: { name: 'Enzo T.', updatedAt: NOW } },
      { returnDocument: 'after' }
    );
    expect(result).toEqual({ _id: 'user-1', name: 'Enzo T.' });
  });
});

describe('gestion des voyages', () => {
  it('should insert a trip', async () => {
    // Arrange
    mockInsertOne.mockResolvedValue({ insertedId: 'trip-1' });
    const tripData = {
      title: 'Japon',
      destination: 'Tokyo',
      startDate: NOW,
      endDate: NOW,
      ownerId: 'user-1',
      collaborators: [],
      isPublic: false,
      visibility: 'private' as const,
      status: 'draft' as const,
    };

    // Act
    const result = await service.createTrip(tripData);

    // Assert
    expect(result._id).toBe('trip-1');
  });

  it('should list the trips owned by or shared with a user', async () => {
    // Arrange
    mockToArray.mockResolvedValue([{ _id: 'trip-1' }]);

    // Act
    const result = await service.getTripsByUserId('user-1');

    // Assert
    expect(mockFind).toHaveBeenCalledWith({
      $or: [{ ownerId: 'user-1' }, { 'collaborators.userId': 'user-1' }],
    });
    expect(result).toEqual([{ _id: 'trip-1' }]);
  });

  it('should fetch a trip by id', async () => {
    // Arrange
    mockFindOne.mockResolvedValue({ _id: 'trip-1' });

    // Act
    const result = await service.getTripById('trip-1');

    // Assert
    expect(mockFindOne).toHaveBeenCalledWith({ _id: 'trip-1' });
    expect(result).toEqual({ _id: 'trip-1' });
  });

  it('should update a trip', async () => {
    // Arrange
    mockFindOneAndUpdate.mockResolvedValue({ _id: 'trip-1', title: 'Japon 2026' });

    // Act
    const result = await service.updateTrip('trip-1', { title: 'Japon 2026' });

    // Assert
    expect(result).toEqual({ _id: 'trip-1', title: 'Japon 2026' });
  });

  it('should report true when the trip was deleted', async () => {
    // Arrange
    mockDeleteOne.mockResolvedValue({ deletedCount: 1 });

    // Act
    const result = await service.deleteTrip('trip-1');

    // Assert
    expect(mockDeleteOne).toHaveBeenCalledWith({ _id: 'trip-1' });
    expect(result).toBe(true);
  });

  it('should report false when no trip matched the deletion', async () => {
    // Arrange
    mockDeleteOne.mockResolvedValue({ deletedCount: 0 });

    // Act
    const result = await service.deleteTrip('trip-inexistant');

    // Assert
    expect(result).toBe(false);
  });

  it('should forward the search query to the trips collection', async () => {
    // Arrange
    mockToArray.mockResolvedValue([]);

    // Act
    const result = await service.searchTrips({ status: 'validated' });

    // Assert
    expect(mockFind).toHaveBeenCalledWith({ status: 'validated' });
    expect(result).toEqual([]);
  });
});

describe('gestion des réservations', () => {
  it('should insert a booking', async () => {
    // Arrange
    mockInsertOne.mockResolvedValue({ insertedId: 'booking-1' });

    // Act
    const result = await service.createBooking({
      tripId: 'trip-1',
      type: 'hotel',
      title: 'Hôtel Sakura',
      date: NOW,
      status: 'confirmed',
    });

    // Assert
    expect(result._id).toBe('booking-1');
  });

  it('should list the bookings of a trip', async () => {
    // Arrange
    mockToArray.mockResolvedValue([{ _id: 'booking-1' }]);

    // Act
    const result = await service.getBookingsByTripId('trip-1');

    // Assert
    expect(mockFind).toHaveBeenCalledWith({ tripId: 'trip-1' });
    expect(result).toEqual([{ _id: 'booking-1' }]);
  });

  it('should fetch a booking by id', async () => {
    // Arrange
    mockFindOne.mockResolvedValue({ _id: 'booking-1' });

    // Act
    const result = await service.getBookingById('booking-1');

    // Assert
    expect(mockFindOne).toHaveBeenCalledWith({ _id: 'booking-1' });
    expect(result).toEqual({ _id: 'booking-1' });
  });

  it('should update a booking', async () => {
    // Arrange
    mockFindOneAndUpdate.mockResolvedValue({ _id: 'booking-1', status: 'cancelled' });

    // Act
    const result = await service.updateBooking('booking-1', { status: 'cancelled' });

    // Assert
    expect(result).toEqual({ _id: 'booking-1', status: 'cancelled' });
  });

  it('should delete a booking', async () => {
    // Arrange
    mockDeleteOne.mockResolvedValue({ deletedCount: 1 });

    // Act
    const result = await service.deleteBooking('booking-1');

    // Assert
    expect(result).toBe(true);
  });

  it('should forward the search query to the bookings collection', async () => {
    // Arrange
    mockToArray.mockResolvedValue([]);

    // Act
    const result = await service.searchBookings({ type: 'flight' });

    // Assert
    expect(mockFind).toHaveBeenCalledWith({ type: 'flight' });
    expect(result).toEqual([]);
  });
});

describe('gestion des adresses', () => {
  it('should insert an address', async () => {
    // Arrange
    mockInsertOne.mockResolvedValue({ insertedId: 'address-1' });

    // Act
    const result = await service.createAddress({
      type: 'restaurant',
      name: 'Chez Paul',
      address: '3 rue Neuve',
      city: 'Lille',
      country: 'France',
    });

    // Assert
    expect(result._id).toBe('address-1');
  });

  it('should list the addresses of a trip', async () => {
    // Arrange
    mockToArray.mockResolvedValue([{ _id: 'address-1' }]);

    // Act
    const result = await service.getAddressesByTripId('trip-1');

    // Assert
    expect(mockFind).toHaveBeenCalledWith({ tripId: 'trip-1' });
    expect(result).toEqual([{ _id: 'address-1' }]);
  });

  it('should fetch an address by id', async () => {
    // Arrange
    mockFindOne.mockResolvedValue({ _id: 'address-1' });

    // Act
    const result = await service.getAddressById('address-1');

    // Assert
    expect(mockFindOne).toHaveBeenCalledWith({ _id: 'address-1' });
    expect(result).toEqual({ _id: 'address-1' });
  });

  it('should update an address', async () => {
    // Arrange
    mockFindOneAndUpdate.mockResolvedValue({ _id: 'address-1', city: 'Roubaix' });

    // Act
    const result = await service.updateAddress('address-1', { city: 'Roubaix' });

    // Assert
    expect(result).toEqual({ _id: 'address-1', city: 'Roubaix' });
  });

  it('should delete an address', async () => {
    // Arrange
    mockDeleteOne.mockResolvedValue({ deletedCount: 1 });

    // Act
    const result = await service.deleteAddress('address-1');

    // Assert
    expect(result).toBe(true);
  });

  it('should forward the search query to the addresses collection', async () => {
    // Arrange
    mockToArray.mockResolvedValue([]);

    // Act
    const result = await service.searchAddresses({ userId: 'user-1' });

    // Assert
    expect(mockFind).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(result).toEqual([]);
  });
});

describe('gestion des invitations', () => {
  it('should insert an invitation stamped with the current date', async () => {
    // Arrange
    mockInsertOne.mockResolvedValue({ insertedId: 'invitation-1' });
    const invitationData = {
      tripId: 'trip-1',
      inviterId: 'user-1',
      status: 'pending' as const,
      token: 'tok-123',
      expiresAt: NOW,
    };

    // Act
    const result = await service.createInvitation(invitationData);

    // Assert
    expect(mockInsertOne).toHaveBeenCalledWith({ ...invitationData, createdAt: NOW });
    expect(result).toEqual({ ...invitationData, createdAt: NOW, _id: 'invitation-1' });
  });

  it('should fetch an invitation by token', async () => {
    // Arrange
    mockFindOne.mockResolvedValue({ token: 'tok-123' });

    // Act
    const result = await service.getInvitationByToken('tok-123');

    // Assert
    expect(mockFindOne).toHaveBeenCalledWith({ token: 'tok-123' });
    expect(result).toEqual({ token: 'tok-123' });
  });

  it('should stamp the response date when updating an invitation status', async () => {
    // Arrange
    mockFindOneAndUpdate.mockResolvedValue({ token: 'tok-123', status: 'accepted' });

    // Act
    const result = await service.updateInvitationStatus('tok-123', 'accepted');

    // Assert
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { token: 'tok-123' },
      { $set: { status: 'accepted', respondedAt: NOW } },
      { returnDocument: 'after' }
    );
    expect(result).toEqual({ token: 'tok-123', status: 'accepted' });
  });
});

describe('gestion des notifications', () => {
  it('should insert a notification stamped with the current date', async () => {
    // Arrange
    mockInsertOne.mockResolvedValue({ insertedId: 'notif-1' });
    const notificationData = {
      userId: 'user-1',
      type: 'trip_invitation',
      title: 'Nouvelle invitation',
      message: 'Enzo vous invite',
      read: false,
    };

    // Act
    const result = await service.createNotification(notificationData);

    // Assert
    expect(mockInsertOne).toHaveBeenCalledWith({ ...notificationData, createdAt: NOW });
    expect(result._id).toBe('notif-1');
  });

  it('should list the notifications of a user with the default limit', async () => {
    // Arrange
    mockToArray.mockResolvedValue([{ _id: 'notif-1' }]);

    // Act
    const result = await service.getNotificationsByUserId('user-1');

    // Assert
    expect(mockFind).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result).toEqual([{ _id: 'notif-1' }]);
  });

  it('should honour an explicit notification limit', async () => {
    // Arrange
    mockToArray.mockResolvedValue([]);

    // Act
    await service.getNotificationsByUserId('user-1', 10);

    // Assert
    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it('should report true when a notification was marked as read', async () => {
    // Arrange
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

    // Act
    const result = await service.markNotificationAsRead('notif-1');

    // Assert
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: 'notif-1' },
      { $set: { read: true, readAt: NOW } }
    );
    expect(result).toBe(true);
  });

  it('should report false when the notification was already read', async () => {
    // Arrange
    mockUpdateOne.mockResolvedValue({ modifiedCount: 0 });

    // Act
    const result = await service.markNotificationAsRead('notif-1');

    // Assert
    expect(result).toBe(false);
  });
});

describe('gestion des templates', () => {
  it('should list every public template when no category is given', async () => {
    // Arrange
    mockToArray.mockResolvedValue([{ _id: 'tpl-1' }]);

    // Act
    const result = await service.getTripTemplates();

    // Assert
    expect(mockFind).toHaveBeenCalledWith({ isPublic: true });
    expect(mockSort).toHaveBeenCalledWith({ usageCount: -1 });
    expect(result).toEqual([{ _id: 'tpl-1' }]);
  });

  it('should filter the templates by category when one is given', async () => {
    // Arrange
    mockToArray.mockResolvedValue([]);

    // Act
    await service.getTripTemplates('roadtrip');

    // Assert
    expect(mockFind).toHaveBeenCalledWith({ category: 'roadtrip', isPublic: true });
  });

  it('should fetch a template by id', async () => {
    // Arrange
    mockFindOne.mockResolvedValue({ _id: 'tpl-1' });

    // Act
    const result = await service.getTripTemplateById('tpl-1');

    // Assert
    expect(mockFindOne).toHaveBeenCalledWith({ _id: 'tpl-1' });
    expect(result).toEqual({ _id: 'tpl-1' });
  });

  it('should report true when the usage counter was incremented', async () => {
    // Arrange
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

    // Act
    const result = await service.incrementTemplateUsage('tpl-1');

    // Assert
    expect(mockUpdateOne).toHaveBeenCalledWith({ _id: 'tpl-1' }, { $inc: { usageCount: 1 } });
    expect(result).toBe(true);
  });

  it('should report false when no template matched the increment', async () => {
    // Arrange
    mockUpdateOne.mockResolvedValue({ modifiedCount: 0 });

    // Act
    const result = await service.incrementTemplateUsage('tpl-inexistant');

    // Assert
    expect(result).toBe(false);
  });
});

describe('méthodes utilitaires', () => {
  it('should report the connection as established after connect', async () => {
    // Arrange / Act
    const result = await service.checkConnection();

    // Assert
    expect(result).toBe(true);
  });

  it('should aggregate the document counts of the four main collections', async () => {
    // Arrange
    mockCountDocuments
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(11)
      .mockResolvedValueOnce(13);

    // Act
    const result = await service.getStats();

    // Assert
    expect(result).toEqual({ users: 3, trips: 7, bookings: 11, addresses: 13 });
  });

  it('should count zero for the collections that were never registered', async () => {
    // Arrange — état défensif : la base est ouverte mais les collections manquent
    const internals = service as unknown as Record<string, unknown>;
    internals.users = null;
    internals.trips = null;
    internals.bookings = null;
    internals.addresses = null;
    mockCountDocuments.mockResolvedValue(5);

    // Act
    const result = await service.getStats();

    // Assert
    expect(result).toEqual({ users: 0, trips: 0, bookings: 0, addresses: 0 });
    expect(mockCountDocuments).not.toHaveBeenCalled();
  });

  it('should throw when asking for stats before connecting', async () => {
    // Arrange
    const freshService = loadFreshServiceClass().getInstance();

    // Act / Assert
    await expect(freshService.getStats()).rejects.toThrow('MongoDB non connecté');
  });
});

describe('garde-fou de connexion', () => {
  it('should reject every collection access before connect', async () => {
    // Arrange
    const freshService = loadFreshServiceClass().getInstance();

    // Act / Assert
    await expect(freshService.getUserById('user-1')).rejects.toThrow('MongoDB non connecté');
    expect(await freshService.checkConnection()).toBe(false);
  });
});
