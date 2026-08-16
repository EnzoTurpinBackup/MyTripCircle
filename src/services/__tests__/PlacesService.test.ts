jest.mock('../api/apiCore', () => ({
  request: jest.fn(),
}));

jest.mock('../../config/api', () => ({
  API_BASE_URL: 'https://api.test.com',
}));

import { request } from '../api/apiCore';
import {
  getAddressSuggestions,
  getPlaceDetails,
  searchPlaceByText,
  hasGooglePlacesApiKey,
} from '../PlacesService';

const mockRequest = request as jest.Mock;

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('hasGooglePlacesApiKey', () => {
  it('should advertise the proxy as available since the key lives on the backend', () => {
    // Arrange / Act / Assert
    expect(hasGooglePlacesApiKey).toBe(true);
  });
});

describe('getAddressSuggestions', () => {
  it('should return an empty list without calling the API when the input is blank', async () => {
    // Arrange / Act
    const result = await getAddressSuggestions('   ');

    // Assert
    expect(result).toEqual([]);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('should map the predictions returned by the proxy', async () => {
    // Arrange
    mockRequest.mockResolvedValue({
      predictions: [
        { place_id: 'p1', description: '12 rue de la Paix, Paris' },
        { place_id: 'p2', description: '14 rue de la Paix, Paris' },
      ],
    });

    // Act
    const result = await getAddressSuggestions('  rue de la Paix  ');

    // Assert
    expect(result).toEqual([
      { placeId: 'p1', description: '12 rue de la Paix, Paris' },
      { placeId: 'p2', description: '14 rue de la Paix, Paris' },
    ]);
    expect(mockRequest).toHaveBeenCalledWith(
      '/places/autocomplete?input=rue+de+la+Paix&language=fr'
    );
  });

  it('should bias the search around the given location', async () => {
    // Arrange
    mockRequest.mockResolvedValue({ predictions: [] });

    // Act
    await getAddressSuggestions('gare', undefined, { lat: 48.85, lng: 2.35 });

    // Assert
    expect(mockRequest).toHaveBeenCalledWith(
      '/places/autocomplete?input=gare&language=fr&location=48.85%2C2.35&radius=50000'
    );
  });

  it('should translate a known address type into a Google place type', async () => {
    // Arrange
    mockRequest.mockResolvedValue({ predictions: [] });

    // Act
    await getAddressSuggestions('ibis', undefined, undefined, 'hotel');

    // Assert
    expect(mockRequest).toHaveBeenCalledWith(
      '/places/autocomplete?input=ibis&language=fr&types=lodging'
    );
  });

  it('should omit the type filter when the address type is unknown', async () => {
    // Arrange
    mockRequest.mockResolvedValue({ predictions: [] });

    // Act
    await getAddressSuggestions('ibis', undefined, undefined, 'spa');

    // Assert
    expect(mockRequest).toHaveBeenCalledWith('/places/autocomplete?input=ibis&language=fr');
  });

  it('should return an empty list when the proxy omits the predictions field', async () => {
    // Arrange
    mockRequest.mockResolvedValue({});

    // Act
    const result = await getAddressSuggestions('rue');

    // Assert
    expect(result).toEqual([]);
  });

  it('should return an empty list and warn when the request rejects in development', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRequest.mockRejectedValue(new Error('proxy indisponible'));

    // Act
    const result = await getAddressSuggestions('rue');

    // Assert
    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      '[PlacesService] Erreur getAddressSuggestions:',
      expect.objectContaining({ message: 'proxy indisponible' })
    );
    warnSpy.mockRestore();
  });

  it('should return an empty list without warning when the request rejects in production', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRequest.mockRejectedValue(new Error('proxy indisponible'));

    // Act
    await withoutDevMode(async () => {
      const result = await getAddressSuggestions('rue');

      // Assert
      expect(result).toEqual([]);
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('getPlaceDetails', () => {
  it('should return an empty object without calling the API when the placeId is empty', async () => {
    // Arrange / Act
    const result = await getPlaceDetails('');

    // Assert
    expect(result).toEqual({});
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('should map a complete place payload', async () => {
    // Arrange
    mockRequest.mockResolvedValue({
      result: {
        formatted_address: '5 avenue Anatole France, 75007 Paris',
        address_components: [
          { types: ['locality'], long_name: 'Paris' },
          { types: ['country'], long_name: 'France' },
        ],
        name: 'Tour Eiffel',
        formatted_phone_number: '01 23 45 67 89',
        website: 'https://toureiffel.paris',
        rating: 4.7,
        photoUrl: '/places/photo?ref=eiffel',
      },
    });

    // Act
    const result = await getPlaceDetails('place-eiffel');

    // Assert
    expect(result).toEqual({
      formattedAddress: '5 avenue Anatole France, 75007 Paris',
      city: 'Paris',
      country: 'France',
      name: 'Tour Eiffel',
      phone: '01 23 45 67 89',
      website: 'https://toureiffel.paris',
      rating: 4.7,
      photoUrl: 'https://api.test.com/places/photo?ref=eiffel',
    });
    expect(mockRequest).toHaveBeenCalledWith(
      '/places/details?placeId=place-eiffel&language=fr'
    );
  });

  it('should fall back to the administrative area when no locality is present', async () => {
    // Arrange
    mockRequest.mockResolvedValue({
      result: {
        address_components: [
          { types: ['administrative_area_level_1'], long_name: 'Occitanie' },
          { types: ['country'], long_name: 'France' },
        ],
      },
    });

    // Act
    const result = await getPlaceDetails('place-occitanie');

    // Assert
    expect(result.city).toBe('Occitanie');
  });

  it('should leave every optional field undefined when the payload is bare', async () => {
    // Arrange
    mockRequest.mockResolvedValue({ result: {} });

    // Act
    const result = await getPlaceDetails('place-vide');

    // Assert
    expect(result).toEqual({
      formattedAddress: undefined,
      city: undefined,
      country: undefined,
      name: undefined,
      phone: undefined,
      website: undefined,
      rating: undefined,
      photoUrl: undefined,
    });
  });

  it('should ignore address components that declare no types', async () => {
    // Arrange
    mockRequest.mockResolvedValue({
      result: { address_components: [{ long_name: 'Composant sans types' }] },
    });

    // Act
    const result = await getPlaceDetails('place-sans-types');

    // Assert
    expect(result.city).toBeUndefined();
    expect(result.country).toBeUndefined();
  });

  it('should treat an empty component label as a missing value', async () => {
    // Arrange
    mockRequest.mockResolvedValue({
      result: {
        address_components: [
          { types: ['locality'], long_name: '' },
          { types: ['administrative_area_level_1'], long_name: '' },
          { types: ['country'], long_name: '' },
        ],
      },
    });

    // Act
    const result = await getPlaceDetails('place-labels-vides');

    // Assert
    expect(result.city).toBeUndefined();
    expect(result.country).toBeUndefined();
  });

  it('should drop a non-numeric rating', async () => {
    // Arrange
    mockRequest.mockResolvedValue({ result: { rating: '4.5' } });

    // Act
    const result = await getPlaceDetails('place-note-texte');

    // Assert
    expect(result.rating).toBeUndefined();
  });

  it('should return an empty result when the proxy omits the result field', async () => {
    // Arrange
    mockRequest.mockResolvedValue({});

    // Act
    const result = await getPlaceDetails('place-sans-resultat');

    // Assert
    expect(result.formattedAddress).toBeUndefined();
  });

  it('should encode the placeId in the query string', async () => {
    // Arrange
    mockRequest.mockResolvedValue({ result: {} });

    // Act
    await getPlaceDetails('place id/avec espaces');

    // Assert
    expect(mockRequest).toHaveBeenCalledWith(
      '/places/details?placeId=place%20id%2Favec%20espaces&language=fr'
    );
  });

  it('should return an empty object and warn when the request rejects in development', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRequest.mockRejectedValue(new Error('404 Not Found'));

    // Act
    const result = await getPlaceDetails('place-inconnu');

    // Assert
    expect(result).toEqual({});
    expect(warnSpy).toHaveBeenCalledWith(
      '[PlacesService] Erreur getPlaceDetails:',
      expect.objectContaining({ message: '404 Not Found' })
    );
    warnSpy.mockRestore();
  });

  it('should return an empty object without warning when the request rejects in production', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRequest.mockRejectedValue(new Error('404 Not Found'));

    // Act
    await withoutDevMode(async () => {
      const result = await getPlaceDetails('place-inconnu');

      // Assert
      expect(result).toEqual({});
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('searchPlaceByText', () => {
  it('should return null without calling the API when the query is blank', async () => {
    // Arrange / Act
    const result = await searchPlaceByText('   ');

    // Assert
    expect(result).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('should map the first text-search result', async () => {
    // Arrange
    mockRequest.mockResolvedValue({
      results: [
        {
          place_id: 'p9',
          name: 'Musée du Louvre',
          formatted_address: 'Rue de Rivoli, Paris',
          rating: 4.8,
          photoUrl: '/places/photo?ref=louvre',
        },
        { place_id: 'p10' },
      ],
    });

    // Act
    const result = await searchPlaceByText('Louvre');

    // Assert
    expect(result).toEqual({
      placeId: 'p9',
      name: 'Musée du Louvre',
      formattedAddress: 'Rue de Rivoli, Paris',
      rating: 4.8,
      photoUrl: 'https://api.test.com/places/photo?ref=louvre',
    });
    expect(mockRequest).toHaveBeenCalledWith('/places/textsearch?query=Louvre&language=fr');
  });

  it('should default the optional fields when the result is bare', async () => {
    // Arrange
    mockRequest.mockResolvedValue({ results: [{ place_id: 'p11', rating: 'excellent' }] });

    // Act
    const result = await searchPlaceByText('lieu minimal');

    // Assert
    expect(result).toEqual({
      placeId: 'p11',
      name: '',
      formattedAddress: '',
      rating: undefined,
      photoUrl: undefined,
    });
  });

  it('should return null when the proxy omits the results field', async () => {
    // Arrange
    mockRequest.mockResolvedValue({});

    // Act
    const result = await searchPlaceByText('lieu inconnu');

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when the proxy returns an empty result list', async () => {
    // Arrange
    mockRequest.mockResolvedValue({ results: [] });

    // Act
    const result = await searchPlaceByText('lieu introuvable');

    // Assert
    expect(result).toBeNull();
  });

  it('should return null and warn when the request rejects in development', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRequest.mockRejectedValue(new Error('timeout'));

    // Act
    const result = await searchPlaceByText('Louvre');

    // Assert
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      '[PlacesService] Erreur searchPlaceByText:',
      expect.objectContaining({ message: 'timeout' })
    );
    warnSpy.mockRestore();
  });

  it('should return null without warning when the request rejects in production', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRequest.mockRejectedValue(new Error('timeout'));

    // Act
    await withoutDevMode(async () => {
      const result = await searchPlaceByText('Louvre');

      // Assert
      expect(result).toBeNull();
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
