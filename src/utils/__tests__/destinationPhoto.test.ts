jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

jest.mock('../../services/api/apiCore', () => ({
  request: jest.fn(),
}));

jest.mock('../../config/api', () => ({
  API_BASE_URL: 'https://api.test.com',
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from '../../services/api/apiCore';
import {
  getSyncCachedPhoto,
  getCachedDestinationPhoto,
  fetchDestinationPhotoUrl,
} from '../destinationPhoto';

const mockGetItem = AsyncStorage.getItem as unknown as jest.Mock;
const mockSetItem = AsyncStorage.setItem as unknown as jest.Mock;
const mockRequest = request as jest.Mock;

/**
 * Le cache mémoire du module est global et persiste entre les tests : chaque
 * cas utilise donc une destination distincte pour rester indépendant.
 */
beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
});

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

describe('getSyncCachedPhoto', () => {
  it('should return null when the destination is not in the memory cache', () => {
    // Arrange / Act
    const result = getSyncCachedPhoto('Reykjavik');

    // Assert
    expect(result).toBeNull();
  });

  it('should return the memoised url when the destination was already resolved', async () => {
    // Arrange
    mockGetItem.mockResolvedValue('https://api.test.com/places/photo?ref=oslo');
    await getCachedDestinationPhoto('Oslo');

    // Act
    const result = getSyncCachedPhoto('  OSLO  ');

    // Assert
    expect(result).toBe('https://api.test.com/places/photo?ref=oslo');
  });
});

describe('getCachedDestinationPhoto', () => {
  it('should return null when the destination is blank', async () => {
    // Arrange / Act
    const result = await getCachedDestinationPhoto('   ');

    // Assert
    expect(result).toBeNull();
    expect(mockGetItem).not.toHaveBeenCalled();
  });

  it('should return the persisted url and memoise it when AsyncStorage holds one', async () => {
    // Arrange
    mockGetItem.mockResolvedValue('https://api.test.com/places/photo?ref=lisbonne');

    // Act
    const result = await getCachedDestinationPhoto('Lisbonne');

    // Assert
    expect(result).toBe('https://api.test.com/places/photo?ref=lisbonne');
    expect(mockGetItem).toHaveBeenCalledWith('destination_photo::lisbonne');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('should serve the memory cache without touching AsyncStorage on the second call', async () => {
    // Arrange
    mockGetItem.mockResolvedValue('https://api.test.com/places/photo?ref=porto');
    await getCachedDestinationPhoto('Porto');
    mockGetItem.mockClear();

    // Act
    const result = await getCachedDestinationPhoto('porto');

    // Assert
    expect(result).toBe('https://api.test.com/places/photo?ref=porto');
    expect(mockGetItem).not.toHaveBeenCalled();
  });

  it('should fetch and persist the url when nothing is cached', async () => {
    // Arrange
    mockRequest.mockResolvedValue({ results: [{ photoUrl: '/places/photo?ref=kyoto' }] });

    // Act
    const result = await getCachedDestinationPhoto('Kyoto');

    // Assert
    expect(result).toBe('https://api.test.com/places/photo?ref=kyoto');
    expect(mockSetItem).toHaveBeenCalledWith(
      'destination_photo::kyoto',
      'https://api.test.com/places/photo?ref=kyoto'
    );
  });

  it('should not persist anything when the fetch yields no photo', async () => {
    // Arrange
    mockRequest.mockResolvedValue({ results: [] });

    // Act
    const result = await getCachedDestinationPhoto('Ville sans photo');

    // Assert
    expect(result).toBeNull();
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('should warn and fall back to the fetch when reading the cache throws in development', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetItem.mockRejectedValue(new Error('lecture impossible'));
    mockRequest.mockResolvedValue({ results: [{ photoUrl: '/places/photo?ref=rome' }] });

    // Act
    const result = await getCachedDestinationPhoto('Rome');

    // Assert
    expect(result).toBe('https://api.test.com/places/photo?ref=rome');
    expect(warnSpy).toHaveBeenCalledWith(
      '[destinationPhoto] Erreur lecture cache:',
      expect.objectContaining({ message: 'lecture impossible' })
    );
    warnSpy.mockRestore();
  });

  it('should stay silent when reading the cache throws in production', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetItem.mockRejectedValue(new Error('lecture impossible'));
    mockRequest.mockResolvedValue({ results: [] });

    // Act
    await withoutDevMode(async () => {
      const result = await getCachedDestinationPhoto('Ville lecture ko prod');

      // Assert
      expect(result).toBeNull();
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should warn but still return the url when persisting throws in development', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRequest.mockResolvedValue({ results: [{ photoUrl: '/places/photo?ref=hanoi' }] });
    mockSetItem.mockRejectedValue(new Error('écriture impossible'));

    // Act
    const result = await getCachedDestinationPhoto('Hanoi');

    // Assert
    expect(result).toBe('https://api.test.com/places/photo?ref=hanoi');
    expect(warnSpy).toHaveBeenCalledWith(
      '[destinationPhoto] Erreur écriture cache:',
      expect.objectContaining({ message: 'écriture impossible' })
    );
    warnSpy.mockRestore();
  });

  it('should stay silent when persisting throws in production', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRequest.mockResolvedValue({ results: [{ photoUrl: '/places/photo?ref=quito' }] });
    mockSetItem.mockRejectedValue(new Error('écriture impossible'));

    // Act
    await withoutDevMode(async () => {
      const result = await getCachedDestinationPhoto('Quito');

      // Assert
      expect(result).toBe('https://api.test.com/places/photo?ref=quito');
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('fetchDestinationPhotoUrl', () => {
  it('should return null without calling the API when the destination is blank', async () => {
    // Arrange / Act
    const result = await fetchDestinationPhotoUrl('  ');

    // Assert
    expect(result).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('should query the backend proxy with the trimmed and encoded destination', async () => {
    // Arrange
    mockRequest.mockResolvedValue({ results: [{ photoUrl: '/places/photo?ref=abc' }] });

    // Act
    const result = await fetchDestinationPhotoUrl('  New York  ');

    // Assert
    expect(mockRequest).toHaveBeenCalledWith(
      '/places/textsearch?query=New%20York&language=fr'
    );
    expect(result).toBe('https://api.test.com/places/photo?ref=abc');
  });

  it('should return null when the API answers without a results array', async () => {
    // Arrange
    mockRequest.mockResolvedValue({});

    // Act
    const result = await fetchDestinationPhotoUrl('Ville inconnue');

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when the API answers with an empty results array', async () => {
    // Arrange
    mockRequest.mockResolvedValue({ results: [] });

    // Act
    const result = await fetchDestinationPhotoUrl('Ville vide');

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when the first result is null', async () => {
    // Arrange
    mockRequest.mockResolvedValue({ results: [null] });

    // Act
    const result = await fetchDestinationPhotoUrl('Ville résultat nul');

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when the first result carries no photoUrl', async () => {
    // Arrange
    mockRequest.mockResolvedValue({ results: [{ name: 'Sans photo' }] });

    // Act
    const result = await fetchDestinationPhotoUrl('Ville sans cliché');

    // Assert
    expect(result).toBeNull();
  });

  it('should return null and warn when the request rejects in development', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRequest.mockRejectedValue(new Error('502 Bad Gateway'));

    // Act
    const result = await fetchDestinationPhotoUrl('Ville en erreur');

    // Assert
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      '[destinationPhoto] Erreur fetchDestinationPhotoUrl:',
      expect.objectContaining({ message: '502 Bad Gateway' })
    );
    warnSpy.mockRestore();
  });

  it('should return null without warning when the request rejects in production', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRequest.mockRejectedValue(new Error('502 Bad Gateway'));

    // Act
    await withoutDevMode(async () => {
      const result = await fetchDestinationPhotoUrl('Ville en erreur prod');

      // Assert
      expect(result).toBeNull();
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
