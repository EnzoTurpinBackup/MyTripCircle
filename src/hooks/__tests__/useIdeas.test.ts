import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useIdeas, DESTINATIONS_BASE } from '../useIdeas';
import { ApiService } from '../../services/ApiService';
import { searchPlaceByText } from '../../services/PlacesService';

const mockNavigate = jest.fn();
const mockCreateTrip = jest.fn();
const mockCreateBooking = jest.fn();
const mockCreateAddress = jest.fn();
const mockT = jest.fn((key: string) => key);

let mockUser: { id: string } | null = { id: 'me' };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}));

jest.mock('../../contexts/TripsContext', () => ({
  useTrips: () => ({
    createTrip: mockCreateTrip,
    createBooking: mockCreateBooking,
    createAddress: mockCreateAddress,
  }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('../../services/PlacesService', () => ({
  searchPlaceByText: jest.fn(),
}));

jest.mock('../../services/ApiService', () => ({
  ApiService: { generateItinerary: jest.fn() },
}));

const mockGenerateItinerary = ApiService.generateItinerary as jest.Mock;
const mockSearchPlace = searchPlaceByText as jest.Mock;

const NOW = new Date('2025-05-01T09:00:00.000Z');

const makeItinerary = (overrides: Record<string, unknown> = {}) => ({
  city: 'Lisbonne',
  days: [{ day: 1, morning: { activity: 'Tour Belém', place: 'Torre de Belem' } }],
  ...overrides,
});

const renderIdeas = () => renderHook(() => useIdeas());

/** Génère un itinéraire valide pour la ville et la durée demandées. */
const generateItinerary = async (
  result: { current: ReturnType<typeof useIdeas> },
  { city = 'Lisbonne', days = '3' } = {}
) => {
  act(() => result.current.setCityInput(city));
  act(() => result.current.setDaysInput(days));
  await act(async () => {
    await result.current.generateItinerary();
  });
};

describe('useIdeas', () => {
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    mockT.mockImplementation((key: string) => key);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUser = { id: 'me' };
    mockGenerateItinerary.mockResolvedValue({ itinerary: makeItinerary() });
    mockCreateTrip.mockResolvedValue({ id: 'trip-new' });
    mockCreateBooking.mockResolvedValue({ id: 'book1' });
    mockCreateAddress.mockResolvedValue({ id: 'addr1' });
    mockSearchPlace.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('destinations and categories', () => {
    it('should translate every base destination', () => {
      const { result } = renderIdeas();

      expect(result.current.DESTINATIONS).toHaveLength(DESTINATIONS_BASE.length);
      expect(result.current.DESTINATIONS[0]).toEqual(
        expect.objectContaining({
          id: '1',
          name: 'ideas.destinations.1.name',
          country: 'ideas.destinations.1.country',
        })
      );
    });

    it('should expose the category filters', () => {
      const { result } = renderIdeas();

      expect(result.current.CATEGORIES.map((c) => c.id)).toEqual([
        'all',
        'beach',
        'mountain',
        'nature',
        'culture',
        'city',
      ]);
    });

    it('should list every destination when no filter is applied', () => {
      const { result } = renderIdeas();

      expect(result.current.filtered).toHaveLength(DESTINATIONS_BASE.length);
    });

    it('should keep only the destinations of the active category', () => {
      const { result } = renderIdeas();

      act(() => result.current.setActiveCategory('mountain'));

      expect(result.current.filtered).toHaveLength(1);
      expect(result.current.filtered[0].id).toBe('5');
    });

    it('should keep the destinations whose name matches the search', () => {
      mockT.mockImplementation((key: string) => (key === 'ideas.destinations.7.name' ? 'Bangkok' : key));
      const { result } = renderIdeas();

      act(() => result.current.setSearch('bangkok'));

      expect(result.current.filtered.map((d) => d.id)).toEqual(['7']);
    });

    it('should keep the destinations whose country matches the search', () => {
      mockT.mockImplementation((key: string) =>
        key === 'ideas.destinations.3.country' ? 'Japon' : key
      );
      const { result } = renderIdeas();

      act(() => result.current.setSearch('japon'));

      expect(result.current.filtered.map((d) => d.id)).toEqual(['3']);
    });

    it('should list nothing when no destination matches the search', () => {
      const { result } = renderIdeas();

      act(() => result.current.setSearch('atlantide'));

      expect(result.current.filtered).toEqual([]);
    });
  });

  describe('modal', () => {
    it('should reset the itinerary form when the modal opens', async () => {
      const { result } = renderIdeas();
      await generateItinerary(result);

      act(() => result.current.openModal());

      expect(result.current.modalVisible).toBe(true);
      expect(result.current.itinerary).toBeNull();
      expect(result.current.cityInput).toBe('');
      expect(result.current.daysInput).toBe('3');
      expect(result.current.showCreateStep).toBe(false);
    });

    it('should close the modal and leave the creation step', () => {
      const { result } = renderIdeas();
      act(() => result.current.openModal());
      act(() => result.current.setShowCreateStep(true));

      act(() => result.current.closeModal());

      expect(result.current.modalVisible).toBe(false);
      expect(result.current.showCreateStep).toBe(false);
    });

    it('should drop the generated itinerary when it is reset', async () => {
      const { result } = renderIdeas();
      await generateItinerary(result);
      act(() => result.current.setShowCreateStep(true));

      act(() => result.current.resetItinerary());

      expect(result.current.itinerary).toBeNull();
      expect(result.current.showCreateStep).toBe(false);
    });
  });

  describe('generateItinerary', () => {
    it('should generate the itinerary for the requested city and duration', async () => {
      const { result } = renderIdeas();

      await generateItinerary(result, { city: '  Lisbonne  ', days: '4' });

      expect(mockGenerateItinerary).toHaveBeenCalledWith({ city: 'Lisbonne', days: 4 });
      expect(result.current.itinerary).toEqual(makeItinerary());
      expect(result.current.loading).toBe(false);
    });

    it('should not call the api when the city is blank', async () => {
      const { result } = renderIdeas();

      await generateItinerary(result, { city: '   ' });

      expect(mockGenerateItinerary).not.toHaveBeenCalled();
    });

    it('should not call the api when the duration is not a number', async () => {
      const { result } = renderIdeas();

      await generateItinerary(result, { days: 'trois' });

      expect(mockGenerateItinerary).not.toHaveBeenCalled();
    });

    it('should not call the api when the duration is below one day', async () => {
      const { result } = renderIdeas();

      await generateItinerary(result, { days: '0' });

      expect(mockGenerateItinerary).not.toHaveBeenCalled();
    });

    it('should not call the api when the duration exceeds thirty days', async () => {
      const { result } = renderIdeas();

      await generateItinerary(result, { days: '31' });

      expect(mockGenerateItinerary).not.toHaveBeenCalled();
    });

    it('should alert about the daily quota when it is reached', async () => {
      mockGenerateItinerary.mockRejectedValue(new Error('daily_limit_reached'));
      const { result } = renderIdeas();

      await generateItinerary(result);

      expect(Alert.alert).toHaveBeenCalledWith(
        'ideas.itinerary.limitTitle',
        'ideas.itinerary.limitMessage'
      );
      expect(result.current.itinerary).toBeNull();
    });

    it('should alert when the ai backend is not configured', async () => {
      mockGenerateItinerary.mockRejectedValue(new Error('ai_not_configured'));
      const { result } = renderIdeas();

      await generateItinerary(result);

      expect(Alert.alert).toHaveBeenCalledWith(
        'ideas.itinerary.errorTitle',
        'ideas.itinerary.notConfiguredMessage'
      );
    });

    it('should surface any other api error message', async () => {
      mockGenerateItinerary.mockRejectedValue(new Error('service indisponible'));
      const { result } = renderIdeas();

      await generateItinerary(result);

      expect(Alert.alert).toHaveBeenCalledWith('ideas.itinerary.errorTitle', 'service indisponible');
    });

    it('should fall back to a generic message when the failure carries none', async () => {
      mockGenerateItinerary.mockRejectedValue(undefined);
      const { result } = renderIdeas();

      await generateItinerary(result);

      expect(Alert.alert).toHaveBeenCalledWith(
        'ideas.itinerary.errorTitle',
        'ideas.itinerary.errorMessage'
      );
      expect(result.current.loading).toBe(false);
    });
  });

  describe('handleCreateTrip', () => {
    it('should do nothing without a generated itinerary', async () => {
      const { result } = renderIdeas();

      await act(async () => {
        await result.current.handleCreateTrip();
      });

      expect(mockCreateTrip).not.toHaveBeenCalled();
    });

    it('should create the trip on the itinerary city and duration', async () => {
      const { result } = renderIdeas();
      await generateItinerary(result, { days: '3' });

      await act(async () => {
        await result.current.handleCreateTrip();
      });

      expect(mockCreateTrip).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Lisbonne',
          destination: 'Lisbonne',
          startDate: NOW,
          endDate: new Date('2025-05-03T09:00:00.000Z'),
          ownerId: 'me',
          visibility: 'private',
          status: 'draft',
        })
      );
      expect(result.current.creating).toBe(false);
    });

    it('should create a single day trip when the duration is unreadable', async () => {
      const { result } = renderIdeas();
      await generateItinerary(result);
      act(() => result.current.setDaysInput('trois'));

      await act(async () => {
        await result.current.handleCreateTrip();
      });

      expect(mockCreateTrip).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: NOW, endDate: NOW })
      );
    });

    it('should create the trip without an owner when nobody is authenticated', async () => {
      mockUser = null;
      const { result } = renderIdeas();
      await generateItinerary(result);

      await act(async () => {
        await result.current.handleCreateTrip();
      });

      expect(mockCreateTrip).toHaveBeenCalledWith(expect.objectContaining({ ownerId: '' }));
    });

    it('should close the modal and open the created trip', async () => {
      const { result } = renderIdeas();
      await generateItinerary(result);

      await act(async () => {
        await result.current.handleCreateTrip();
      });

      expect(result.current.modalVisible).toBe(false);
      expect(result.current.itinerary).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('TripDetails', {
        tripId: 'trip-new',
        showToast: true,
      });
    });

    it('should alert when the trip creation fails', async () => {
      mockCreateTrip.mockRejectedValue(new Error('boom'));
      const { result } = renderIdeas();
      await generateItinerary(result);

      await act(async () => {
        await result.current.handleCreateTrip();
      });

      expect(warnSpy).toHaveBeenCalledWith('[useIdeas] Erreur création voyage:', expect.any(Error));
      expect(Alert.alert).toHaveBeenCalledWith(
        'ideas.itinerary.errorTitle',
        'ideas.itinerary.createError'
      );
      expect(result.current.creating).toBe(false);
    });

    it('should stay silent about the creation failure outside development', async () => {
      const originalDev = (global as { __DEV__: boolean }).__DEV__;
      (global as { __DEV__: boolean }).__DEV__ = false;
      mockCreateTrip.mockRejectedValue(new Error('boom'));
      const { result } = renderIdeas();
      await generateItinerary(result);

      await act(async () => {
        await result.current.handleCreateTrip();
      });

      expect(warnSpy).not.toHaveBeenCalled();
      (global as { __DEV__: boolean }).__DEV__ = originalDev;
    });
  });

  describe('hotel entry', () => {
    const createTripFromItinerary = async (result: { current: ReturnType<typeof useIdeas> }) => {
      await generateItinerary(result);
      await act(async () => {
        await result.current.handleCreateTrip();
      });
    };

    it('should book the resolved hotel for the whole trip and save its address', async () => {
      mockSearchPlace.mockImplementation((query: string) =>
        query.startsWith('hotel')
          ? Promise.resolve({
              name: 'Pousada de Lisboa',
              formattedAddress: 'Praça do Comércio, Lisbonne, Portugal',
              rating: 4.8,
              photoUrl: 'https://photos/hotel.jpg',
            })
          : Promise.resolve(null)
      );
      const { result } = renderIdeas();

      await createTripFromItinerary(result);

      expect(mockSearchPlace).toHaveBeenCalledWith('hotel Lisbonne');
      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hotel',
          title: 'Pousada de Lisboa',
          address: 'Praça do Comércio, Lisbonne, Portugal',
          date: NOW,
          endDate: new Date('2025-05-03T09:00:00.000Z'),
        })
      );
      expect(mockCreateAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hotel',
          name: 'Pousada de Lisboa',
          city: 'Lisbonne',
          country: 'Portugal',
          rating: 4.8,
          photoUrl: 'https://photos/hotel.jpg',
        })
      );
    });

    it('should fall back to a generic hotel title when no place matches', async () => {
      const { result } = renderIdeas();

      await createTripFromItinerary(result);

      expect(warnSpy).toHaveBeenCalledWith('[useIdeas] Places: aucun résultat pour "hotel Lisbonne"');
      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'hotel', title: 'Hébergement – Lisbonne', address: undefined })
      );
    });

    it('should still book the hotel when the place lookup fails', async () => {
      mockSearchPlace.mockRejectedValue(new Error('quota'));
      const { result } = renderIdeas();

      await createTripFromItinerary(result);

      expect(errorSpy).toHaveBeenCalledWith(
        '[useIdeas] Places textsearch échoué pour "hotel Lisbonne":',
        expect.any(Error)
      );
      expect(mockCreateBooking).toHaveBeenCalledWith(expect.objectContaining({ type: 'hotel' }));
    });

    it('should log without failing when the hotel address cannot be created', async () => {
      mockSearchPlace.mockResolvedValue({
        name: 'Pousada de Lisboa',
        formattedAddress: 'Praça do Comércio, Lisbonne, Portugal',
      });
      mockCreateAddress.mockRejectedValue(new Error('boom'));
      const { result } = renderIdeas();

      await createTripFromItinerary(result);

      expect(errorSpy).toHaveBeenCalledWith(
        '[useIdeas] createAddress (hotel) échoué:',
        expect.any(Error)
      );
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('should keep building the trip when the hotel booking fails', async () => {
      mockCreateBooking.mockRejectedValueOnce(new Error('boom'));
      const { result } = renderIdeas();

      await createTripFromItinerary(result);

      expect(warnSpy).toHaveBeenCalledWith('[useIdeas] Erreur création hôtel:', expect.any(Error));
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('should stay silent about the hotel failure outside development', async () => {
      const originalDev = (global as { __DEV__: boolean }).__DEV__;
      (global as { __DEV__: boolean }).__DEV__ = false;
      mockCreateBooking.mockRejectedValueOnce(new Error('boom'));
      const { result } = renderIdeas();

      await createTripFromItinerary(result);

      expect(warnSpy).not.toHaveBeenCalledWith('[useIdeas] Erreur création hôtel:', expect.any(Error));
      (global as { __DEV__: boolean }).__DEV__ = originalDev;
    });

    it('should use the city as fallback when the address has no readable parts', async () => {
      mockSearchPlace.mockResolvedValue({ name: 'Pousada', formattedAddress: ' , ' });
      const { result } = renderIdeas();

      await createTripFromItinerary(result);

      expect(mockCreateAddress).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'hotel', city: 'Lisbonne', country: 'Lisbonne' })
      );
    });

    it('should use the city as fallback when the address holds a single part', async () => {
      mockSearchPlace.mockResolvedValue({ name: 'Pousada', formattedAddress: 'Portugal' });
      const { result } = renderIdeas();

      await createTripFromItinerary(result);

      expect(mockCreateAddress).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'hotel', city: 'Lisbonne', country: 'Portugal' })
      );
    });

    it('should not create an address when the resolved hotel has no name', async () => {
      mockSearchPlace.mockResolvedValue({ formattedAddress: 'Praça do Comércio, Lisbonne, Portugal' });
      const { result } = renderIdeas();

      await createTripFromItinerary(result);

      expect(mockCreateAddress).not.toHaveBeenCalled();
    });
  });

  describe('activity entries', () => {
    const createTripFrom = async (itinerary: Record<string, unknown>) => {
      mockGenerateItinerary.mockResolvedValue({ itinerary });
      const view = renderIdeas();
      await generateItinerary(view.result);
      await act(async () => {
        await view.result.current.handleCreateTrip();
      });
      return view;
    };

    it('should book each activity of the itinerary on its own day', async () => {
      await createTripFrom(
        makeItinerary({
          days: [
            { day: 1, morning: { activity: 'Tour Belém' } },
            { day: 2, evening: { activity: 'Fado' } },
          ],
        })
      );

      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'activity', title: 'Tour Belém', date: NOW })
      );
      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'activity',
          title: 'Fado',
          date: new Date('2025-05-02T09:00:00.000Z'),
        })
      );
    });

    it('should search the precise place named by the ai', async () => {
      await createTripFrom(
        makeItinerary({ days: [{ day: 1, morning: { activity: 'Tour', place: 'Torre de Belem' } }] })
      );

      expect(mockSearchPlace).toHaveBeenCalledWith('Torre de Belem Lisbonne');
    });

    it('should search the activity title when the ai names no place', async () => {
      await createTripFrom(makeItinerary({ days: [{ day: 1, morning: { activity: 'Tour Belém' } }] }));

      expect(mockSearchPlace).toHaveBeenCalledWith('Tour Belém Lisbonne');
    });

    it('should skip the slots without an activity', async () => {
      await createTripFrom(
        makeItinerary({ days: [{ day: 1, morning: { activity: '' }, afternoon: null }] })
      );

      expect(mockCreateBooking).toHaveBeenCalledTimes(1);
      expect(mockCreateBooking).toHaveBeenCalledWith(expect.objectContaining({ type: 'hotel' }));
    });

    it('should handle an itinerary without any day', async () => {
      await createTripFrom({ city: 'Lisbonne' });

      expect(mockCreateBooking).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('should search the hotel without a city when the itinerary names none', async () => {
      await createTripFrom({ days: [] });

      expect(mockSearchPlace).toHaveBeenCalledWith('hotel ');
    });

    it('should save the address of the resolved activity place', async () => {
      mockSearchPlace.mockImplementation((query: string) =>
        query.startsWith('hotel')
          ? Promise.resolve(null)
          : Promise.resolve({
              name: 'Torre de Belém',
              formattedAddress: 'Av. Brasília, Lisbonne, Portugal',
              rating: 4.5,
              photoUrl: 'https://photos/torre.jpg',
            })
      );

      await createTripFrom(makeItinerary());

      expect(mockCreateAddress).toHaveBeenCalledWith({
        type: 'activity',
        name: 'Torre de Belém',
        address: 'Av. Brasília, Lisbonne, Portugal',
        city: 'Lisbonne',
        country: 'Portugal',
        rating: 4.5,
        photoUrl: 'https://photos/torre.jpg',
        tripId: 'trip-new',
      });
    });

    it('should warn when no place matches the activity', async () => {
      await createTripFrom(makeItinerary());

      expect(warnSpy).toHaveBeenCalledWith(
        '[useIdeas] Places: aucun résultat pour "Torre de Belem Lisbonne"'
      );
      expect(mockCreateAddress).not.toHaveBeenCalled();
    });

    it('should keep booking the activity when its place lookup fails', async () => {
      mockSearchPlace.mockRejectedValue(new Error('quota'));

      await createTripFrom(makeItinerary());

      expect(errorSpy).toHaveBeenCalledWith(
        '[useIdeas] Places textsearch échoué pour "Torre de Belem Lisbonne":',
        expect.any(Error)
      );
      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'activity', title: 'Tour Belém' })
      );
    });

    it('should log without failing when the activity booking fails', async () => {
      mockCreateBooking.mockResolvedValueOnce({ id: 'hotel' }).mockRejectedValue(new Error('boom'));

      await createTripFrom(makeItinerary());

      expect(errorSpy).toHaveBeenCalledWith(
        '[useIdeas] createBooking échoué pour "Tour Belém":',
        expect.any(Error)
      );
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('should log without failing when the activity address cannot be created', async () => {
      mockSearchPlace.mockResolvedValue({
        name: 'Torre de Belém',
        formattedAddress: 'Av. Brasília, Lisbonne, Portugal',
      });
      mockCreateAddress.mockRejectedValue(new Error('boom'));

      await createTripFrom(makeItinerary());

      expect(errorSpy).toHaveBeenCalledWith(
        '[useIdeas] createAddress échoué pour "Torre de Belém":',
        expect.any(Error)
      );
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('should not create an address when the resolved place has no name', async () => {
      mockSearchPlace.mockImplementation((query: string) =>
        query.startsWith('hotel')
          ? Promise.resolve(null)
          : Promise.resolve({ formattedAddress: 'Av. Brasília, Lisbonne, Portugal' })
      );

      await createTripFrom(makeItinerary());

      expect(mockCreateAddress).not.toHaveBeenCalled();
    });
  });
});
