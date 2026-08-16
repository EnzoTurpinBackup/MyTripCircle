import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import useEditTrip from '../useEditTrip';
import ApiService from '../../services/ApiService';
import { parseApiError } from '../../utils/i18n';
import { fetchDestinationPhotoUrl } from '../../utils/destinationPhoto';
import type { Address, Booking } from '../../types';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockUpdateTrip = jest.fn();
const mockDeleteTrip = jest.fn();
const mockCreateBooking = jest.fn();
const mockUpdateBooking = jest.fn();
const mockDeleteBooking = jest.fn();
const mockCreateAddress = jest.fn();
const mockUpdateAddress = jest.fn();
const mockDeleteAddress = jest.fn();
const mockGetAddressesByTripId = jest.fn();

let mockUser: { id: string } | null = { id: 'owner1' };
let mockAllBookings: Booking[] = [];
let mockAllAddresses: Address[] = [];

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, reset: mockReset }),
  useRoute: () => ({ params: { tripId: 'trip1' } }),
  // Reproduit React Navigation : le callback est rejoué quand ses dépendances changent.
  useFocusEffect: (callback: () => void) =>
    (require('react') as typeof React).useEffect(callback, [callback]),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../contexts/TripsContext', () => ({
  useTrips: () => ({
    updateTrip: mockUpdateTrip,
    deleteTrip: mockDeleteTrip,
    createBooking: mockCreateBooking,
    updateBooking: mockUpdateBooking,
    deleteBooking: mockDeleteBooking,
    createAddress: mockCreateAddress,
    updateAddress: mockUpdateAddress,
    deleteAddress: mockDeleteAddress,
    bookings: mockAllBookings,
    addresses: mockAllAddresses,
    getAddressesByTripId: mockGetAddressesByTripId,
  }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('../../utils/i18n', () => ({
  parseApiError: jest.fn(),
}));

jest.mock('../../utils/destinationPhoto', () => ({
  fetchDestinationPhotoUrl: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('../../services/ApiService', () => ({
  __esModule: true,
  default: {
    getTripById: jest.fn(),
    getBookingsByTripId: jest.fn(),
    getAddressesByTripId: jest.fn(),
  },
}));

const mockApi = ApiService as unknown as {
  getTripById: jest.Mock;
  getBookingsByTripId: jest.Mock;
  getAddressesByTripId: jest.Mock;
};
const mockParseApiError = parseApiError as jest.Mock;
const mockFetchPhoto = fetchDestinationPhotoUrl as jest.Mock;
const mockRequestPermission = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockLaunchLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;

const makeRawTrip = (overrides: Record<string, unknown> = {}) => ({
  _id: 'trip1',
  title: 'Rome',
  description: 'Cité éternelle',
  destination: 'Italie',
  startDate: '2025-06-01T00:00:00.000Z',
  endDate: '2025-06-08T00:00:00.000Z',
  ownerId: 'owner1',
  visibility: 'private',
  isPublic: false,
  status: 'draft',
  coverImage: 'https://photos/rome.jpg',
  ...overrides,
});

const makeRawBooking = (overrides: Record<string, unknown> = {}) => ({
  _id: 'book1',
  tripId: 'trip1',
  type: 'hotel',
  title: 'Hôtel Central',
  date: '2025-06-01T00:00:00.000Z',
  status: 'pending',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const makeRawAddress = (overrides: Record<string, unknown> = {}) => ({
  _id: 'addr1',
  type: 'restaurant',
  name: 'Chez Léon',
  address: '1 via Roma',
  city: 'Rome',
  country: 'Italie',
  tripId: 'trip1',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'book1',
  tripId: 'trip1',
  type: 'hotel',
  title: 'Hôtel Central',
  date: new Date('2025-06-01T00:00:00.000Z'),
  status: 'pending',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  ...overrides,
});

const makeAddress = (overrides: Partial<Address> = {}): Address => ({
  id: 'addr1',
  type: 'restaurant',
  name: 'Chez Léon',
  address: '1 via Roma',
  city: 'Rome',
  country: 'Italie',
  tripId: 'trip1',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  ...overrides,
});

/** Récupère les boutons de la dernière Alert affichée. */
const lastAlertButtons = () => {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  return calls[calls.length - 1][2];
};

const renderLoaded = async () => {
  const view = renderHook(() => useEditTrip());
  await act(async () => {});
  await act(async () => {});
  return view;
};

describe('useEditTrip', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUser = { id: 'owner1' };
    mockAllBookings = [];
    mockAllAddresses = [];
    mockGetAddressesByTripId.mockReturnValue([]);
    mockApi.getTripById.mockResolvedValue(makeRawTrip());
    mockApi.getBookingsByTripId.mockResolvedValue([]);
    mockApi.getAddressesByTripId.mockResolvedValue([]);
    mockFetchPhoto.mockResolvedValue(null);
    mockParseApiError.mockReturnValue('erreur api');
    mockRequestPermission.mockResolvedValue({ status: 'granted' });
    mockLaunchLibrary.mockResolvedValue({ canceled: true, assets: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('initial load', () => {
    it('should fill the form with the trip returned by the api', async () => {
      const { result } = await renderLoaded();

      expect(mockApi.getTripById).toHaveBeenCalledWith('trip1');
      expect(result.current.formData).toEqual({
        title: 'Rome',
        description: 'Cité éternelle',
        destination: 'Italie',
        startDate: new Date('2025-06-01T00:00:00.000Z'),
        endDate: new Date('2025-06-08T00:00:00.000Z'),
        visibility: 'private',
        status: 'draft',
        coverImage: 'https://photos/rome.jpg',
      });
      expect(result.current.initialLoading).toBe(false);
      expect(result.current.isOwner).toBe(true);
    });

    it('should fall back to an empty description when the trip has none', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ description: undefined }));

      const { result } = await renderLoaded();

      expect(result.current.formData.description).toBe('');
    });

    it('should mark the trip as validated when the api says so', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ status: 'validated' }));

      const { result } = await renderLoaded();

      expect(result.current.formData.status).toBe('validated');
    });

    it('should not consider the user as owner when the trip belongs to someone else', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ ownerId: 'someone-else' }));

      const { result } = await renderLoaded();

      expect(result.current.isOwner).toBe(false);
    });

    it('should keep the empty form when the trip is not found', async () => {
      mockApi.getTripById.mockResolvedValue(null);

      const { result } = await renderLoaded();

      expect(result.current.formData.title).toBe('');
      expect(result.current.initialLoading).toBe(false);
    });

    it('should abort the load when the trip dates are unreadable', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ startDate: 'pas-une-date' }));
      mockApi.getBookingsByTripId.mockResolvedValue([makeRawBooking()]);

      const { result } = await renderLoaded();

      expect(result.current.formData.title).toBe('');
      expect(result.current.bookings).toEqual([]);
      expect(result.current.initialLoading).toBe(false);
    });

    it('should map the bookings and their optional end date', async () => {
      mockApi.getBookingsByTripId.mockResolvedValue([
        makeRawBooking({ endDate: '2025-06-05T00:00:00.000Z' }),
        makeRawBooking({ _id: 'book2' }),
      ]);

      const { result } = await renderLoaded();

      expect(result.current.bookings[0].endDate).toEqual(new Date('2025-06-05T00:00:00.000Z'));
      expect(result.current.bookings[1].endDate).toBeUndefined();
    });

    it('should tolerate an empty booking response', async () => {
      mockApi.getBookingsByTripId.mockResolvedValue(undefined);

      const { result } = await renderLoaded();

      expect(result.current.bookings).toEqual([]);
    });

    it('should map the addresses of the trip', async () => {
      mockApi.getAddressesByTripId.mockResolvedValue([makeRawAddress()]);

      const { result } = await renderLoaded();

      expect(result.current.addresses[0]).toEqual(
        expect.objectContaining({ id: 'addr1', name: 'Chez Léon' })
      );
    });

    it('should tolerate an empty address response', async () => {
      mockApi.getAddressesByTripId.mockResolvedValue(undefined);

      const { result } = await renderLoaded();

      expect(result.current.addresses).toEqual([]);
    });

    it('should tolerate an address fetch failure', async () => {
      mockApi.getAddressesByTripId.mockRejectedValue(new Error('boom'));

      const { result } = await renderLoaded();

      expect(result.current.addresses).toEqual([]);
      expect(result.current.formData.title).toBe('Rome');
    });

    it('should log the error when the trip cannot be loaded', async () => {
      mockApi.getTripById.mockRejectedValue(new Error('boom'));

      const { result } = await renderLoaded();

      expect(errorSpy).toHaveBeenCalledWith(
        '[useEditTrip] Erreur lors du chargement des données:',
        expect.any(Error)
      );
      expect(result.current.initialLoading).toBe(false);
    });

    it('should fetch a cover photo when the trip has none', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ coverImage: '' }));
      mockFetchPhoto.mockResolvedValue('https://photos/italie.jpg');

      const { result } = await renderLoaded();

      expect(mockFetchPhoto).toHaveBeenCalledWith('Italie');
      expect(result.current.formData.coverImage).toBe('https://photos/italie.jpg');
    });

    it('should leave the cover empty when no photo is found', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ coverImage: '' }));

      const { result } = await renderLoaded();

      expect(result.current.formData.coverImage).toBe('');
    });

    it('should not fetch a cover photo when the trip has no destination', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ coverImage: '', destination: '' }));

      const { result } = await renderLoaded();

      expect(mockFetchPhoto).not.toHaveBeenCalled();
      expect(result.current.formData.coverImage).toBe('');
    });
  });

  describe('visibility', () => {
    it('should keep the friends visibility', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ visibility: 'friends' }));

      const { result } = await renderLoaded();

      expect(result.current.formData.visibility).toBe('friends');
    });

    it('should keep the public visibility', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ visibility: 'public' }));

      const { result } = await renderLoaded();

      expect(result.current.formData.visibility).toBe('public');
    });

    it('should derive the public visibility from the isPublic flag', async () => {
      mockApi.getTripById.mockResolvedValue(
        makeRawTrip({ visibility: undefined, isPublic: true })
      );

      const { result } = await renderLoaded();

      expect(result.current.formData.visibility).toBe('public');
    });

    it('should default to a private trip', async () => {
      mockApi.getTripById.mockResolvedValue(
        makeRawTrip({ visibility: undefined, isPublic: false })
      );

      const { result } = await renderLoaded();

      expect(result.current.formData.visibility).toBe('private');
    });
  });

  describe('address resync on focus', () => {
    it('should replace the addresses with the cached ones when the screen regains focus', async () => {
      mockGetAddressesByTripId.mockReturnValue([makeAddress({ id: 'cached' })]);

      const { result } = await renderLoaded();

      expect(result.current.addresses.map((a) => a.id)).toEqual(['cached']);
    });

    it('should keep the loaded addresses when the cache is empty', async () => {
      mockApi.getAddressesByTripId.mockResolvedValue([makeRawAddress()]);

      const { result } = await renderLoaded();

      expect(result.current.addresses.map((a) => a.id)).toEqual(['addr1']);
    });
  });

  describe('cover photo auto-fetch', () => {
    it('should look up a photo when the destination changes on a trip without cover', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ coverImage: '', destination: '' }));
      const { result } = await renderLoaded();
      mockFetchPhoto.mockResolvedValue('https://photos/lisbonne.jpg');

      act(() => result.current.setFormData((p) => ({ ...p, destination: 'Lisbonne' })));
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(mockFetchPhoto).toHaveBeenCalledWith('Lisbonne');
      expect(result.current.formData.coverImage).toBe('https://photos/lisbonne.jpg');
    });

    it('should debounce consecutive destination edits into a single lookup', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ coverImage: '', destination: '' }));
      const { result } = await renderLoaded();
      mockFetchPhoto.mockClear();

      act(() => result.current.setFormData((p) => ({ ...p, destination: 'Lisb' })));
      act(() => jest.advanceTimersByTime(300));
      act(() => result.current.setFormData((p) => ({ ...p, destination: 'Lisbonne' })));
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(mockFetchPhoto).toHaveBeenCalledTimes(1);
      expect(mockFetchPhoto).toHaveBeenCalledWith('Lisbonne');
    });

    it('should ignore a destination shorter than three characters', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ coverImage: '', destination: '' }));
      const { result } = await renderLoaded();
      mockFetchPhoto.mockClear();

      act(() => result.current.setFormData((p) => ({ ...p, destination: 'Li' })));
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(mockFetchPhoto).not.toHaveBeenCalled();
    });

    it('should keep the cover empty when no photo matches the new destination', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ coverImage: '', destination: '' }));
      const { result } = await renderLoaded();

      act(() => result.current.setFormData((p) => ({ ...p, destination: 'Lisbonne' })));
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(result.current.formData.coverImage).toBe('');
    });

    it('should not overwrite a cover already set on the trip', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ coverImage: '', destination: '' }));
      const { result } = await renderLoaded();
      act(() =>
        result.current.setFormData((p) => ({ ...p, coverImage: 'https://photos/deja.jpg' }))
      );
      mockFetchPhoto.mockClear();

      act(() => result.current.setFormData((p) => ({ ...p, destination: 'Lisbonne' })));
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(mockFetchPhoto).not.toHaveBeenCalled();
      expect(result.current.formData.coverImage).toBe('https://photos/deja.jpg');
    });

    it('should never overwrite a cover chosen by the user', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ coverImage: '', destination: '' }));
      mockLaunchLibrary.mockResolvedValue({ canceled: false, assets: [{ uri: 'file://photo.jpg' }] });
      const { result } = await renderLoaded();
      await act(async () => {
        await result.current.handlePickCoverPhoto();
      });
      mockFetchPhoto.mockClear();

      act(() => result.current.setFormData((p) => ({ ...p, destination: 'Lisbonne' })));
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(mockFetchPhoto).not.toHaveBeenCalled();
      expect(result.current.formData.coverImage).toBe('file://photo.jpg');
    });
  });

  describe('handlePickCoverPhoto', () => {
    it('should alert when the media library permission is denied', async () => {
      mockRequestPermission.mockResolvedValue({ status: 'denied' });
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handlePickCoverPhoto();
      });

      expect(Alert.alert).toHaveBeenCalledWith('common.error', 'editTrip.coverPermissionDenied');
      expect(mockLaunchLibrary).not.toHaveBeenCalled();
    });

    it('should store the picked photo as cover', async () => {
      mockLaunchLibrary.mockResolvedValue({ canceled: false, assets: [{ uri: 'file://photo.jpg' }] });
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handlePickCoverPhoto();
      });

      expect(result.current.formData.coverImage).toBe('file://photo.jpg');
    });

    it('should keep the current cover when the picker is cancelled', async () => {
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handlePickCoverPhoto();
      });

      expect(result.current.formData.coverImage).toBe('https://photos/rome.jpg');
    });

    it('should keep the current cover when the picked asset has no uri', async () => {
      mockLaunchLibrary.mockResolvedValue({ canceled: false, assets: [{}] });
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handlePickCoverPhoto();
      });

      expect(result.current.formData.coverImage).toBe('https://photos/rome.jpg');
    });

    it('should log the error when the picker fails', async () => {
      mockRequestPermission.mockRejectedValue(new Error('boom'));
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handlePickCoverPhoto();
      });

      expect(errorSpy).toHaveBeenCalledWith(
        '[useEditTrip] Erreur lors de la sélection de la photo:',
        expect.any(Error)
      );
    });
  });

  describe('handleUpdateTrip', () => {
    it('should refuse to save a trip without a title', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setFormData((p) => ({ ...p, title: '  ' })));

      await act(async () => {
        await result.current.handleUpdateTrip();
      });

      expect(Alert.alert).toHaveBeenCalledWith('createTrip.error', 'createTrip.titleRequired');
      expect(mockUpdateTrip).not.toHaveBeenCalled();
    });

    it('should refuse to save a trip without a destination', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.setFormData((p) => ({ ...p, destination: '' })));

      await act(async () => {
        await result.current.handleUpdateTrip();
      });

      expect(Alert.alert).toHaveBeenCalledWith('createTrip.error', 'createTrip.destinationRequired');
      expect(mockUpdateTrip).not.toHaveBeenCalled();
    });

    it('should do nothing when no user is authenticated', async () => {
      mockUser = null;
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleUpdateTrip();
      });

      expect(mockUpdateTrip).not.toHaveBeenCalled();
    });

    it('should save the trimmed form and open the trip details', async () => {
      mockUpdateTrip.mockResolvedValue(undefined);
      const { result } = await renderLoaded();
      act(() => result.current.setFormData((p) => ({ ...p, title: '  Rome  ' })));

      await act(async () => {
        await result.current.handleUpdateTrip();
      });

      expect(mockUpdateTrip).toHaveBeenCalledWith('trip1', {
        title: 'Rome',
        description: 'Cité éternelle',
        destination: 'Italie',
        startDate: new Date('2025-06-01T00:00:00.000Z'),
        endDate: new Date('2025-06-08T00:00:00.000Z'),
        isPublic: false,
        visibility: 'private',
        status: 'draft',
        coverImage: 'https://photos/rome.jpg',
      });
      expect(mockNavigate).toHaveBeenCalledWith('TripDetails', { tripId: 'trip1', showToast: true });
      expect(result.current.loading).toBe(false);
    });

    it('should mark the trip as public when its visibility is public', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ visibility: 'public' }));
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleUpdateTrip();
      });

      expect(mockUpdateTrip).toHaveBeenCalledWith(
        'trip1',
        expect.objectContaining({ isPublic: true })
      );
    });

    it('should save no cover when the trip has none', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ coverImage: '' }));
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleUpdateTrip();
      });

      expect(mockUpdateTrip).toHaveBeenCalledWith(
        'trip1',
        expect.objectContaining({ coverImage: undefined })
      );
    });

    it('should alert with the parsed api error when the save fails', async () => {
      mockUpdateTrip.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('voyage verrouillé');
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleUpdateTrip();
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'voyage verrouillé');
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
    });
  });

  describe('handleDeleteTrip', () => {
    it('should ask for confirmation before deleting the trip', async () => {
      const { result } = await renderLoaded();

      act(() => result.current.handleDeleteTrip());

      expect(Alert.alert).toHaveBeenCalledWith(
        'editTrip.deleteTrip',
        'editTrip.deleteConfirmMessage',
        expect.any(Array)
      );
      expect(mockDeleteTrip).not.toHaveBeenCalled();
    });

    it('should delete the trip and return to the main screen when confirmed', async () => {
      mockDeleteTrip.mockResolvedValue(true);
      const { result } = await renderLoaded();
      act(() => result.current.handleDeleteTrip());

      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });

      expect(mockDeleteTrip).toHaveBeenCalledWith('trip1');
      expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Main' }] });
    });

    it('should alert with the parsed api error when the deletion fails', async () => {
      mockDeleteTrip.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('suppression refusée');
      const { result } = await renderLoaded();
      act(() => result.current.handleDeleteTrip());

      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'suppression refusée');
      expect(mockReset).not.toHaveBeenCalled();
    });
  });

  describe('items available for copy', () => {
    it('should expose only the bookings and addresses of the other trips', async () => {
      mockAllBookings = [makeBooking(), makeBooking({ id: 'book9', tripId: 'other' })];
      mockAllAddresses = [makeAddress(), makeAddress({ id: 'addr9', tripId: 'other' })];

      const { result } = await renderLoaded();

      expect(result.current.otherBookings.map((b) => b.id)).toEqual(['book9']);
      expect(result.current.otherAddresses.map((a) => a.id)).toEqual(['addr9']);
    });
  });

  describe('handleCopyBooking', () => {
    it('should copy the booking into the edited trip without its identifiers', async () => {
      const copied = makeBooking({ id: 'copied' });
      mockCreateBooking.mockResolvedValue(copied);
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleCopyBooking(
          makeBooking({ id: 'book9', tripId: 'other', attachments: ['a::b'] })
        );
      });

      const payload = mockCreateBooking.mock.calls[0][0];
      expect(payload).not.toHaveProperty('id');
      expect(payload).not.toHaveProperty('attachments');
      expect(payload.tripId).toBe('trip1');
      expect(result.current.bookings).toEqual([copied]);
    });

    it('should alert with the parsed api error when the booking copy fails', async () => {
      mockCreateBooking.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('copie refusée');
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleCopyBooking(makeBooking());
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'copie refusée');
    });

    it('should alert with the generic message when the copy error cannot be parsed', async () => {
      mockCreateBooking.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('');
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleCopyBooking(makeBooking());
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'editTrip.saveError');
    });
  });

  describe('handleCopyAddress', () => {
    it('should copy the address into the edited trip without its identifiers', async () => {
      const copied = makeAddress({ id: 'copied' });
      mockCreateAddress.mockResolvedValue(copied);
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleCopyAddress(makeAddress({ id: 'addr9', tripId: 'other' }));
      });

      const payload = mockCreateAddress.mock.calls[0][0];
      expect(payload).not.toHaveProperty('id');
      expect(payload.tripId).toBe('trip1');
      expect(result.current.addresses).toEqual([copied]);
    });

    it('should alert with the parsed api error when the address copy fails', async () => {
      mockCreateAddress.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('copie refusée');
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleCopyAddress(makeAddress());
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'copie refusée');
    });
  });

  describe('address navigation', () => {
    it('should navigate to the address form for a new address', async () => {
      const { result } = await renderLoaded();

      act(() => result.current.handleAddAddress());

      expect(mockNavigate).toHaveBeenCalledWith('AddressForm', { tripId: 'trip1' });
    });

    it('should navigate to the address form of the edited address', async () => {
      mockApi.getAddressesByTripId.mockResolvedValue([makeRawAddress({ _id: 'addr7' })]);
      const { result } = await renderLoaded();

      act(() => result.current.handleEditAddress(0));

      expect(mockNavigate).toHaveBeenCalledWith('AddressForm', { addressId: 'addr7' });
    });

    it('should not navigate when no address sits at the given index', async () => {
      const { result } = await renderLoaded();

      act(() => result.current.handleEditAddress(3));

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not navigate when the address has no id', async () => {
      mockApi.getAddressesByTripId.mockResolvedValue([makeRawAddress({ _id: undefined })]);
      const { result } = await renderLoaded();

      act(() => result.current.handleEditAddress(0));

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('calendar', () => {
    it('should apply the dates picked in the calendar to the form', async () => {
      const { result } = await renderLoaded();

      act(() => result.current.openCalendar('start'));
      act(() => result.current.handleCalendarDayPress(15));

      expect(result.current.formData.startDate).toEqual(new Date(2025, 5, 15));
      expect(result.current.formData.endDate).toEqual(new Date(2025, 5, 15));
    });
  });

  describe('handleCancel', () => {
    it('should ask for confirmation before leaving the form', async () => {
      const { result } = await renderLoaded();

      act(() => result.current.handleCancel());

      expect(Alert.alert).toHaveBeenCalledWith(
        'editTrip.cancelTitle',
        'editTrip.cancelMessage',
        expect.any(Array)
      );
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('should go back when leaving the form is confirmed', async () => {
      const { result } = await renderLoaded();
      act(() => result.current.handleCancel());

      act(() => lastAlertButtons()[1].onPress());

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
