import { getCached, geocodeAddress } from '../geocoding';

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

/**
 * `geocodeAddress` patiente 1,1 s entre les deux tentatives Nominatim.
 * On court-circuite ce délai en exécutant le callback immédiatement plutôt
 * qu'avec `jest.useFakeTimers()`, qui remplacerait aussi les microtâches et
 * ferait geler les chaînes asynchrones du preset Expo.
 */
function runTimeoutsImmediately(): jest.SpyInstance {
  return jest
    .spyOn(globalThis, 'setTimeout')
    .mockImplementation(((callback: () => void) => {
      callback();
      return 0 as unknown as NodeJS.Timeout;
    }) as unknown as typeof setTimeout);
}

/** Réponse Nominatim renvoyant une unique correspondance. */
function okResponse(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) };
}

let timeoutSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  timeoutSpy = runTimeoutsImmediately();
});

afterEach(() => {
  timeoutSpy.mockRestore();
});

describe('getCached', () => {
  it('should return undefined when the address has never been geocoded', () => {
    // Arrange / Act
    const result = getCached('1 rue Inconnue', 'Nulle Part', 'France');

    // Assert
    expect(result).toBeUndefined();
  });

  it('should return the coordinates when the address is already cached', async () => {
    // Arrange
    mockFetch.mockResolvedValue(okResponse([{ lat: '48.8566', lon: '2.3522' }]));
    await geocodeAddress('10 rue de Rivoli', 'Paris', 'France');

    // Act
    const result = getCached('10 rue de Rivoli', 'Paris', 'France');

    // Assert
    expect(result).toEqual({ latitude: 48.8566, longitude: 2.3522 });
  });

  it('should return null when a previous geocoding attempt yielded no result', async () => {
    // Arrange
    mockFetch.mockResolvedValue(okResponse([]));
    await geocodeAddress('adresse fantôme', '', '');

    // Act
    const result = getCached('adresse fantôme', '', '');

    // Assert
    expect(result).toBeNull();
  });

  it('should normalise the cache key to lower case', async () => {
    // Arrange
    mockFetch.mockResolvedValue(okResponse([{ lat: '43.6047', lon: '1.4442' }]));
    await geocodeAddress('5 Place du Capitole', 'Toulouse', 'France');

    // Act
    const result = getCached('5 place du capitole', 'toulouse', 'france');

    // Assert
    expect(result).toEqual({ latitude: 43.6047, longitude: 1.4442 });
  });
});

describe('geocodeAddress', () => {
  it('should query Nominatim with the full address and return parsed coordinates', async () => {
    // Arrange
    mockFetch.mockResolvedValue(okResponse([{ lat: '45.7640', lon: '4.8357' }]));

    // Act
    const result = await geocodeAddress('20 rue Victor Hugo', 'Lyon', 'France');

    // Assert
    expect(result).toEqual({ latitude: 45.764, longitude: 4.8357 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://nominatim.openstreetmap.org/search?q=20%20rue%20Victor%20Hugo%2C%20Lyon%2C%20France&format=json&limit=1',
      {
        headers: {
          'User-Agent': 'MyTripCircle/1.0',
          'Accept-Language': 'fr,en',
        },
      }
    );
  });

  it('should return the cached coordinates without re-fetching when already resolved', async () => {
    // Arrange
    mockFetch.mockResolvedValue(okResponse([{ lat: '44.8378', lon: '-0.5792' }]));
    await geocodeAddress('1 cours Alsace', 'Bordeaux', 'France');
    mockFetch.mockClear();

    // Act
    const result = await geocodeAddress('1 cours Alsace', 'Bordeaux', 'France');

    // Assert
    expect(result).toEqual({ latitude: 44.8378, longitude: -0.5792 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return the cached null without re-fetching when the address was already unresolvable', async () => {
    // Arrange
    mockFetch.mockResolvedValue(okResponse([]));
    await geocodeAddress('adresse introuvable durable', '', '');
    mockFetch.mockClear();

    // Act
    const result = await geocodeAddress('adresse introuvable durable', '', '');

    // Assert
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fall back to city and country when the full address yields nothing', async () => {
    // Arrange
    mockFetch
      .mockResolvedValueOnce(okResponse([]))
      .mockResolvedValueOnce(okResponse([{ lat: '43.2965', lon: '5.3698' }]));

    // Act
    const result = await geocodeAddress('adresse ambiguë', 'Marseille', 'France');

    // Assert
    expect(result).toEqual({ latitude: 43.2965, longitude: 5.3698 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenLastCalledWith(
      'https://nominatim.openstreetmap.org/search?q=Marseille%2C%20France&format=json&limit=1',
      expect.anything()
    );
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1100);
  });

  it('should not retry when the city is missing', async () => {
    // Arrange
    mockFetch.mockResolvedValue(okResponse([]));

    // Act
    const result = await geocodeAddress('lieu-dit sans ville', '', 'France');

    // Assert
    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should not retry when the country is missing', async () => {
    // Arrange
    mockFetch.mockResolvedValue(okResponse([]));

    // Act
    const result = await geocodeAddress('lieu-dit sans pays', 'Annecy', '');

    // Assert
    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should return null when Nominatim answers with a non-ok status', async () => {
    // Arrange
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve([]) });

    // Act
    const result = await geocodeAddress('adresse 503', '', '');

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when Nominatim answers with a non-array payload', async () => {
    // Arrange
    mockFetch.mockResolvedValue(okResponse({ error: 'Unable to geocode' }));

    // Act
    const result = await geocodeAddress('adresse payload objet', '', '');

    // Assert
    expect(result).toBeNull();
  });

  it('should return null and warn when the network call throws in development', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch.mockRejectedValue(new Error('réseau injoignable'));

    // Act
    const result = await geocodeAddress('adresse réseau ko', '', '');

    // Assert
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      '[geocoding] Erreur géocodage:',
      expect.objectContaining({ message: 'réseau injoignable' })
    );
    warnSpy.mockRestore();
  });

  it('should return null without warning when the network call throws in production', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    mockFetch.mockRejectedValue(new Error('réseau injoignable'));

    // Act
    const result = await geocodeAddress('adresse réseau ko prod', '', '');

    // Assert
    expect(result).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
    warnSpy.mockRestore();
  });
});
