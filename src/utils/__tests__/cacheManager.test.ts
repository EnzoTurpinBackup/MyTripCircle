jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    getAllKeys: jest.fn(),
    multiRemove: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheManager, CACHE_KEYS, CACHE_TTL } from '../cacheManager';
import { freezeClockAt, restoreClock } from '../../components/invitations/__tests__/frozenClock';

const mockGetItem = AsyncStorage.getItem as unknown as jest.Mock;
const mockSetItem = AsyncStorage.setItem as unknown as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as unknown as jest.Mock;
const mockGetAllKeys = AsyncStorage.getAllKeys as unknown as jest.Mock;
const mockMultiRemove = AsyncStorage.multiRemove as unknown as jest.Mock;

const NOW = new Date('2026-01-15T10:00:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
  freezeClockAt(NOW);
  mockSetItem.mockResolvedValue(undefined);
  mockRemoveItem.mockResolvedValue(undefined);
  mockMultiRemove.mockResolvedValue(undefined);
});

afterEach(() => {
  restoreClock();
});

/** Sérialise une entrée de cache telle que `set` l'écrirait. */
function serializeEntry(data: unknown, timestamp: number, ttl: number): string {
  return JSON.stringify({ data, timestamp, ttl });
}

describe('CacheManager.get', () => {
  it('should return the cached data when the entry is still fresh', async () => {
    // Arrange
    const payload = [{ id: 't1' }];
    mockGetItem.mockResolvedValue(serializeEntry(payload, NOW.getTime() - 1000, 60_000));

    // Act
    const result = await CacheManager.get<typeof payload>(CACHE_KEYS.TRIPS);

    // Assert
    expect(result).toEqual(payload);
    expect(mockGetItem).toHaveBeenCalledWith('@mtc_cache/trips');
  });

  it('should return the cached data when the entry expires exactly now', async () => {
    // Arrange — la condition est `>`, l'instant pile d'expiration reste valide
    mockGetItem.mockResolvedValue(serializeEntry('pile', NOW.getTime() - 60_000, 60_000));

    // Act
    const result = await CacheManager.get<string>(CACHE_KEYS.BOOKINGS);

    // Assert
    expect(result).toBe('pile');
  });

  it('should return null when the entry has expired', async () => {
    // Arrange
    mockGetItem.mockResolvedValue(serializeEntry('perimé', NOW.getTime() - 60_001, 60_000));

    // Act
    const result = await CacheManager.get<string>(CACHE_KEYS.BOOKINGS);

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when no entry is stored', async () => {
    // Arrange
    mockGetItem.mockResolvedValue(null);

    // Act
    const result = await CacheManager.get<string>(CACHE_KEYS.FRIENDS);

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when the stored payload is not valid JSON', async () => {
    // Arrange
    mockGetItem.mockResolvedValue('{ corrompu');

    // Act
    const result = await CacheManager.get<string>(CACHE_KEYS.FRIENDS);

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when AsyncStorage rejects', async () => {
    // Arrange
    mockGetItem.mockRejectedValue(new Error('storage indisponible'));

    // Act
    const result = await CacheManager.get<string>(CACHE_KEYS.ADDRESSES);

    // Assert
    expect(result).toBeNull();
  });
});

describe('CacheManager.getStale', () => {
  it('should return the cached data even when the entry has expired', async () => {
    // Arrange
    mockGetItem.mockResolvedValue(serializeEntry(['vieux'], NOW.getTime() - 999_999, 1_000));

    // Act
    const result = await CacheManager.getStale<string[]>(CACHE_KEYS.FRIEND_REQUESTS);

    // Assert
    expect(result).toEqual(['vieux']);
    expect(mockGetItem).toHaveBeenCalledWith('@mtc_cache/friend_requests');
  });

  it('should return null when no entry is stored', async () => {
    // Arrange
    mockGetItem.mockResolvedValue(null);

    // Act
    const result = await CacheManager.getStale<string>(CACHE_KEYS.FRIEND_SUGGESTIONS);

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when the stored payload is not valid JSON', async () => {
    // Arrange
    mockGetItem.mockResolvedValue('pas du json');

    // Act
    const result = await CacheManager.getStale<string>(CACHE_KEYS.FRIEND_SUGGESTIONS);

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when AsyncStorage rejects', async () => {
    // Arrange
    mockGetItem.mockRejectedValue(new Error('storage indisponible'));

    // Act
    const result = await CacheManager.getStale<string>(CACHE_KEYS.TRIPS);

    // Assert
    expect(result).toBeNull();
  });
});

describe('CacheManager.set', () => {
  it('should persist the data with the current timestamp and the given TTL', async () => {
    // Arrange
    const payload = { id: 'b1' };

    // Act
    await CacheManager.set(CACHE_KEYS.BOOKINGS, payload, CACHE_TTL.BOOKINGS);

    // Assert
    expect(mockSetItem).toHaveBeenCalledWith(
      '@mtc_cache/bookings',
      serializeEntry(payload, NOW.getTime(), CACHE_TTL.BOOKINGS)
    );
  });

  it('should swallow the failure when AsyncStorage rejects', async () => {
    // Arrange
    mockSetItem.mockRejectedValue(new Error('quota dépassé'));

    // Act / Assert
    await expect(CacheManager.set(CACHE_KEYS.TRIPS, 'x', 1000)).resolves.toBeUndefined();
  });
});

describe('CacheManager.invalidate', () => {
  it('should remove the prefixed key', async () => {
    // Arrange / Act
    await CacheManager.invalidate(CACHE_KEYS.ADDRESSES);

    // Assert
    expect(mockRemoveItem).toHaveBeenCalledWith('@mtc_cache/addresses');
  });

  it('should swallow the failure when AsyncStorage rejects', async () => {
    // Arrange
    mockRemoveItem.mockRejectedValue(new Error('storage indisponible'));

    // Act / Assert
    await expect(CacheManager.invalidate(CACHE_KEYS.TRIPS)).resolves.toBeUndefined();
  });
});

describe('CacheManager.clearAll', () => {
  it('should remove only the keys carrying the cache prefix', async () => {
    // Arrange
    mockGetAllKeys.mockResolvedValue([
      '@mtc_cache/trips',
      '@mytripcircle_language',
      '@mtc_cache/friends',
    ]);

    // Act
    await CacheManager.clearAll();

    // Assert
    expect(mockMultiRemove).toHaveBeenCalledWith(['@mtc_cache/trips', '@mtc_cache/friends']);
  });

  it('should not call multiRemove when no cache key exists', async () => {
    // Arrange
    mockGetAllKeys.mockResolvedValue(['@mytripcircle_language']);

    // Act
    await CacheManager.clearAll();

    // Assert
    expect(mockMultiRemove).not.toHaveBeenCalled();
  });

  it('should swallow the failure when AsyncStorage rejects', async () => {
    // Arrange
    mockGetAllKeys.mockRejectedValue(new Error('storage indisponible'));

    // Act / Assert
    await expect(CacheManager.clearAll()).resolves.toBeUndefined();
    expect(mockMultiRemove).not.toHaveBeenCalled();
  });
});
