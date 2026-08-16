import { renderHook, act } from '@testing-library/react-native';
import { Alert, Animated } from 'react-native';
import i18n from 'i18next';
import { useIdeaDetail } from '../useIdeaDetail';
import { getTripIdeaById, type SuggestedBooking, type TripIdea } from '../../data/tripIdeas';
import { searchPlaceByText } from '../../services/PlacesService';

const mockNavigate = jest.fn();
const mockCreateTrip = jest.fn();
const mockCreateBooking = jest.fn();
const mockCreateAddress = jest.fn();

let mockUser: { id: string } | null = { id: 'me' };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: { ideaId: 'tulum' } }),
}));

const mockT = jest.fn((key: string) => key);

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

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { primary: '#000' }, isDark: false }),
}));

jest.mock('../../utils/i18n', () => ({
  formatDate: jest.fn(),
}));

jest.mock('../../services/PlacesService', () => ({
  searchPlaceByText: jest.fn(),
}));

jest.mock('../../data/tripIdeas', () => ({
  ...jest.requireActual('../../data/tripIdeas'),
  getTripIdeaById: jest.fn(),
}));

const mockGetTripIdeaById = getTripIdeaById as jest.Mock;
const mockSearchPlace = searchPlaceByText as jest.Mock;

const NOW = new Date('2025-05-01T09:00:00.000Z');
/** startDate initial : aujourd'hui + 7 jours. */
const EXPECTED_START = new Date('2025-05-08T09:00:00.000Z');

const makeSuggestedBooking = (overrides: Partial<SuggestedBooking> = {}): SuggestedBooking => ({
  type: 'activity',
  titleFr: 'Visite des cénotes',
  titleEn: 'Cenote tour',
  currency: '€',
  estimatedPrice: 40,
  placeSearchQuery: 'cenote tulum',
  ...overrides,
});

const makeIdea = (overrides: Partial<TripIdea> = {}): TripIdea => ({
  id: 'tulum',
  duration: 5,
  difficulty: 'easy',
  destinationCity: 'Tulum',
  destinationCountry: 'Mexique',
  highlightsFr: [],
  highlightsEn: [],
  itinerary: [1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    titleFr: `Jour ${day}`,
    titleEn: `Day ${day}`,
    activitiesFr: [],
    activitiesEn: [],
  })),
  suggestedBookings: [makeSuggestedBooking()],
  ...overrides,
});

const renderIdeaDetail = () => renderHook(() => useIdeaDetail());

/** Crée un voyage depuis la modale, titre déjà renseigné. */
const createTripFrom = async (result: { current: ReturnType<typeof useIdeaDetail> }) => {
  act(() => result.current.setTripTitle('Tulum – Mexique'));
  await act(async () => {
    await result.current.handleCreate();
  });
};

describe('useIdeaDetail', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockT.mockImplementation((key: string) => key);
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    // Les animations sont pilotées par le driver natif, absent des tests :
    // on les exécute immédiatement pour observer leur effet de bord.
    jest.spyOn(Animated, 'parallel').mockReturnValue({
      start: (onComplete?: () => void) => onComplete?.(),
    } as never);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockUser = { id: 'me' };
    mockGetTripIdeaById.mockReturnValue(makeIdea());
    mockCreateTrip.mockResolvedValue({ id: 'trip-new' });
    mockCreateBooking.mockResolvedValue({ id: 'book1' });
    mockCreateAddress.mockResolvedValue({ id: 'addr1' });
    mockSearchPlace.mockResolvedValue(null);
    i18n.language = 'fr-FR';
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should load the idea named in the route params', () => {
    const { result } = renderIdeaDetail();

    expect(mockGetTripIdeaById).toHaveBeenCalledWith('tulum');
    expect(result.current.idea?.id).toBe('tulum');
  });

  it('should start on the idea duration one week from now', () => {
    const { result } = renderIdeaDetail();

    expect(result.current.customDays).toBe(5);
    expect(result.current.startDate).toEqual(EXPECTED_START);
    expect(result.current.endDate).toEqual(new Date('2025-05-12T09:00:00.000Z'));
    expect(result.current.modalVisible).toBe(false);
    expect(result.current.creating).toBe(false);
  });

  it('should default to a week when the idea is unknown', () => {
    mockGetTripIdeaById.mockReturnValue(undefined);

    const { result } = renderIdeaDetail();

    expect(result.current.customDays).toBe(7);
    expect(result.current.destinationName).toBe('');
    expect(result.current.destinationCountry).toBe('');
  });

  it('should translate the destination of the idea', () => {
    const { result } = renderIdeaDetail();

    expect(result.current.destinationName).toBe('ideas.destinations.tulum.name');
    expect(result.current.destinationCountry).toBe('ideas.destinations.tulum.country');
  });

  describe('language', () => {
    it('should use french when the active language is a french variant', () => {
      const { result } = renderIdeaDetail();

      expect(result.current.lang).toBe('fr');
    });

    it('should use english when the active language is not french', () => {
      i18n.language = 'en-GB';

      const { result } = renderIdeaDetail();

      expect(result.current.lang).toBe('en');
    });

    it('should use english when no language is active', () => {
      i18n.language = undefined as unknown as string;

      const { result } = renderIdeaDetail();

      expect(result.current.lang).toBe('en');
    });
  });

  describe('modal', () => {
    it('should open the modal prefilled with the destination', () => {
      const { result } = renderIdeaDetail();

      act(() => result.current.openModal());

      expect(result.current.modalVisible).toBe(true);
      expect(result.current.tripTitle).toBe(
        'ideas.destinations.tulum.name – ideas.destinations.tulum.country'
      );
    });

    it('should hide the modal once the closing animation ends', () => {
      const { result } = renderIdeaDetail();
      act(() => result.current.openModal());

      act(() => result.current.closeModal());

      expect(result.current.modalVisible).toBe(false);
    });
  });

  describe('changeCustomDays', () => {
    it('should increase the number of days', () => {
      const { result } = renderIdeaDetail();

      act(() => result.current.changeCustomDays((prev) => prev + 1));

      expect(result.current.customDays).toBe(6);
    });

    it('should cap the number of days at the itinerary length', () => {
      const { result } = renderIdeaDetail();

      act(() => result.current.changeCustomDays(() => 99));

      expect(result.current.customDays).toBe(6);
    });

    it('should cap the number of days at fourteen when the idea is unknown', () => {
      mockGetTripIdeaById.mockReturnValue(undefined);
      const { result } = renderIdeaDetail();

      act(() => result.current.changeCustomDays(() => 99));

      expect(result.current.customDays).toBe(14);
    });

    it('should never go below a single day', () => {
      const { result } = renderIdeaDetail();

      act(() => result.current.changeCustomDays(() => 0));

      expect(result.current.customDays).toBe(1);
    });
  });

  describe('handleCreate', () => {
    it('should refuse to create a trip without a title', async () => {
      const { result } = renderIdeaDetail();

      await act(async () => {
        await result.current.handleCreate();
      });

      expect(Alert.alert).toHaveBeenCalledWith('common.error', 'ideas.addModal.titleRequired');
      expect(mockCreateTrip).not.toHaveBeenCalled();
    });

    it('should do nothing when no user is authenticated', async () => {
      mockUser = null;
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(mockCreateTrip).not.toHaveBeenCalled();
    });

    it('should do nothing when the idea is unknown', async () => {
      mockGetTripIdeaById.mockReturnValue(undefined);
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(mockCreateTrip).not.toHaveBeenCalled();
    });

    it('should create a private draft trip on the selected dates', async () => {
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(mockCreateTrip).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Tulum – Mexique',
          destination: 'ideas.destinations.tulum.country',
          startDate: EXPECTED_START,
          endDate: new Date('2025-05-12T09:00:00.000Z'),
          isPublic: false,
          visibility: 'private',
          status: 'draft',
          ownerId: 'me',
        })
      );
    });

    it('should fall back to the destination name when the country has no translation', async () => {
      // i18next renvoie la `defaultValue` — ici vide — quand la clé est absente.
      mockT.mockImplementation((key: string, options?: { defaultValue?: string }) =>
        key.endsWith('.country') ? (options?.defaultValue ?? '') : key
      );
      const { result } = renderIdeaDetail();
      act(() => result.current.setTripTitle('Voyage'));

      await act(async () => {
        await result.current.handleCreate();
      });

      expect(mockCreateTrip).toHaveBeenCalledWith(
        expect.objectContaining({ destination: 'ideas.destinations.tulum.name' })
      );
    });

    it('should open the created trip and close the modal', async () => {
      const { result } = renderIdeaDetail();
      act(() => result.current.openModal());

      await createTripFrom(result);

      expect(result.current.modalVisible).toBe(false);
      expect(result.current.creating).toBe(false);
      expect(mockNavigate).toHaveBeenCalledWith('TripDetails', {
        tripId: 'trip-new',
        showToast: true,
      });
    });

    it('should alert and stop creating when the trip creation fails', async () => {
      mockCreateTrip.mockRejectedValue(new Error('boom'));
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(warnSpy).toHaveBeenCalledWith(
        '[useIdeaDetail] Erreur création voyage:',
        expect.any(Error)
      );
      expect(Alert.alert).toHaveBeenCalledWith('common.error', 'ideas.addModal.createError');
      expect(result.current.creating).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should stay silent about the creation failure outside development', async () => {
      const originalDev = (global as { __DEV__: boolean }).__DEV__;
      (global as { __DEV__: boolean }).__DEV__ = false;
      mockCreateTrip.mockRejectedValue(new Error('boom'));
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(warnSpy).not.toHaveBeenCalled();
      (global as { __DEV__: boolean }).__DEV__ = originalDev;
    });
  });

  describe('suggested bookings', () => {
    it('should spread the daily bookings over the trip days', async () => {
      mockGetTripIdeaById.mockReturnValue(
        makeIdea({
          suggestedBookings: [
            makeSuggestedBooking({ type: 'activity' }),
            makeSuggestedBooking({ type: 'restaurant' }),
          ],
        })
      );
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(mockCreateBooking.mock.calls[0][0].date).toEqual(EXPECTED_START);
      expect(mockCreateBooking.mock.calls[1][0].date).toEqual(
        new Date('2025-05-09T09:00:00.000Z')
      );
    });

    it('should not spread the daily bookings beyond the last day', async () => {
      mockGetTripIdeaById.mockReturnValue(
        makeIdea({
          suggestedBookings: [
            makeSuggestedBooking(),
            makeSuggestedBooking(),
            makeSuggestedBooking(),
          ],
        })
      );
      const { result } = renderIdeaDetail();
      act(() => result.current.changeCustomDays(() => 2));

      await createTripFrom(result);

      expect(mockCreateBooking.mock.calls[2][0].date).toEqual(
        new Date('2025-05-09T09:00:00.000Z')
      );
    });

    it('should book the hotel for the whole trip', async () => {
      mockGetTripIdeaById.mockReturnValue(
        makeIdea({ suggestedBookings: [makeSuggestedBooking({ type: 'hotel' })] })
      );
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hotel',
          date: EXPECTED_START,
          endDate: new Date('2025-05-12T09:00:00.000Z'),
        })
      );
    });

    it('should book the flight on the departure day without an end date', async () => {
      mockGetTripIdeaById.mockReturnValue(
        makeIdea({ suggestedBookings: [makeSuggestedBooking({ type: 'flight' })] })
      );
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'flight', date: EXPECTED_START, endDate: undefined })
      );
    });

    it('should use the french title when the active language is french', async () => {
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Visite des cénotes' })
      );
    });

    it('should use the english title when the active language is english', async () => {
      i18n.language = 'en';
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Cenote tour' })
      );
    });

    it('should default the currency to euro when the suggestion has none', async () => {
      mockGetTripIdeaById.mockReturnValue(
        makeIdea({ suggestedBookings: [makeSuggestedBooking({ currency: '' })] })
      );
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(mockCreateBooking).toHaveBeenCalledWith(expect.objectContaining({ currency: '€' }));
    });

    it('should attach the resolved place to the booking and create its address', async () => {
      mockSearchPlace.mockResolvedValue({
        name: 'Gran Cenote',
        formattedAddress: 'Carretera 109, Tulum, Mexique',
        rating: 4.6,
        photoUrl: 'https://photos/cenote.jpg',
      });
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(mockSearchPlace).toHaveBeenCalledWith('cenote tulum');
      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({ address: 'Carretera 109, Tulum, Mexique' })
      );
      expect(mockCreateAddress).toHaveBeenCalledWith({
        type: 'activity',
        name: 'Gran Cenote',
        address: 'Carretera 109, Tulum, Mexique',
        city: 'Tulum',
        country: 'Mexique',
        rating: 4.6,
        photoUrl: 'https://photos/cenote.jpg',
        tripId: 'trip-new',
      });
    });

    it('should map the hotel suggestion to a hotel address', async () => {
      mockGetTripIdeaById.mockReturnValue(
        makeIdea({ suggestedBookings: [makeSuggestedBooking({ type: 'hotel' })] })
      );
      mockSearchPlace.mockResolvedValue({
        name: 'Casa Malca',
        formattedAddress: 'Carretera 109, Tulum, Mexique',
      });
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(mockCreateAddress).toHaveBeenCalledWith(expect.objectContaining({ type: 'hotel' }));
    });

    it('should not create an address when no place matches the suggestion', async () => {
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({ address: undefined })
      );
      expect(mockCreateAddress).not.toHaveBeenCalled();
    });

    it('should not create an address when the place has no name', async () => {
      mockSearchPlace.mockResolvedValue({ formattedAddress: 'Carretera 109, Tulum, Mexique' });
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(mockCreateAddress).not.toHaveBeenCalled();
    });

    it('should keep creating the booking when the place lookup fails', async () => {
      mockSearchPlace.mockRejectedValue(new Error('quota'));
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(warnSpy).toHaveBeenCalledWith(
        '[useIdeaDetail] Erreur recherche lieu:',
        expect.any(Error)
      );
      expect(mockCreateBooking).toHaveBeenCalledTimes(1);
    });

    it('should keep going when a booking cannot be created', async () => {
      mockCreateBooking.mockRejectedValue(new Error('boom'));
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(warnSpy).toHaveBeenCalledWith(
        '[useIdeaDetail] Erreur création réservation:',
        expect.any(Error)
      );
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('should keep going when an address cannot be created', async () => {
      mockSearchPlace.mockResolvedValue({
        name: 'Gran Cenote',
        formattedAddress: 'Carretera 109, Tulum, Mexique',
      });
      mockCreateAddress.mockRejectedValue(new Error('boom'));
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(warnSpy).toHaveBeenCalledWith(
        '[useIdeaDetail] Erreur création adresse:',
        expect.any(Error)
      );
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('should stay silent about the place lookup failure outside development', async () => {
      const originalDev = (global as { __DEV__: boolean }).__DEV__;
      (global as { __DEV__: boolean }).__DEV__ = false;
      mockSearchPlace.mockRejectedValue(new Error('quota'));
      const { result } = renderIdeaDetail();

      await createTripFrom(result);

      expect(warnSpy).not.toHaveBeenCalled();
      (global as { __DEV__: boolean }).__DEV__ = originalDev;
    });
  });
});
