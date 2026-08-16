import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useTripData } from '../useTripData';
import ApiService from '../../services/ApiService';
import { parseApiError } from '../../utils/i18n';
import type { Address, Booking, Trip } from '../../types';

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockValidateTrip = jest.fn();
const mockCreateBooking = jest.fn();
const mockUpdateBooking = jest.fn();
const mockDeleteBooking = jest.fn();
const mockCreateAddress = jest.fn();
const mockDeleteAddress = jest.fn();
const mockGetTripById = jest.fn();

let mockAllBookings: Booking[] = [];
let mockAllAddresses: Address[] = [];

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, reset: mockReset }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../contexts/TripsContext', () => ({
  useTrips: () => ({
    validateTrip: mockValidateTrip,
    createBooking: mockCreateBooking,
    updateBooking: mockUpdateBooking,
    deleteBooking: mockDeleteBooking,
    createAddress: mockCreateAddress,
    deleteAddress: mockDeleteAddress,
    bookings: mockAllBookings,
    addresses: mockAllAddresses,
    getTripById: mockGetTripById,
  }),
}));

jest.mock('../../utils/i18n', () => ({
  parseApiError: jest.fn(),
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

const makeRawTrip = (overrides: Record<string, unknown> = {}) => ({
  _id: 'trip1',
  title: 'Rome',
  description: 'Cité éternelle',
  destination: 'Italie',
  startDate: '2025-06-01T00:00:00.000Z',
  endDate: '2025-06-08T00:00:00.000Z',
  ownerId: 'owner1',
  collaborators: [],
  isPublic: false,
  visibility: 'private',
  status: 'draft',
  stats: { totalBookings: 1, totalAddresses: 2, totalCollaborators: 3 },
  location: { type: 'Point', coordinates: [1, 2] },
  tags: ['culture'],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-02T00:00:00.000Z',
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
  userId: 'me',
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
  const view = renderHook(() => useTripData('trip1'));
  await act(async () => {
    await view.result.current.loadTripData();
  });
  return view;
};

describe('useTripData', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAllBookings = [];
    mockAllAddresses = [];
    mockGetTripById.mockReturnValue(undefined);
    mockApi.getTripById.mockResolvedValue(makeRawTrip());
    mockApi.getBookingsByTripId.mockResolvedValue([]);
    mockApi.getAddressesByTripId.mockResolvedValue([]);
    mockParseApiError.mockReturnValue('erreur api');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should start empty and loading', () => {
    const { result } = renderHook(() => useTripData('trip1'));

    expect(result.current.trip).toBeNull();
    expect(result.current.bookings).toEqual([]);
    expect(result.current.addresses).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  describe('loadTripData', () => {
    it('should map the trip returned by the api', async () => {
      const { result } = await renderLoaded();

      expect(result.current.trip).toEqual<Trip>({
        id: 'trip1',
        title: 'Rome',
        description: 'Cité éternelle',
        destination: 'Italie',
        startDate: new Date('2025-06-01T00:00:00.000Z'),
        endDate: new Date('2025-06-08T00:00:00.000Z'),
        ownerId: 'owner1',
        collaborators: [],
        isPublic: false,
        visibility: 'private',
        status: 'draft',
        stats: { totalBookings: 1, totalAddresses: 2, totalCollaborators: 3 },
        location: { type: 'Point', coordinates: [1, 2] },
        tags: ['culture'],
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-02T00:00:00.000Z'),
      });
      expect(result.current.loading).toBe(false);
    });

    it('should apply defaults when the trip has no optional field', async () => {
      mockApi.getTripById.mockResolvedValue(
        makeRawTrip({
          collaborators: undefined,
          visibility: undefined,
          status: undefined,
          stats: undefined,
          location: undefined,
          tags: undefined,
          isPublic: false,
        })
      );

      const { result } = await renderLoaded();

      expect(result.current.trip?.collaborators).toEqual([]);
      expect(result.current.trip?.visibility).toBe('private');
      expect(result.current.trip?.status).toBe('draft');
      expect(result.current.trip?.stats).toEqual({
        totalBookings: 0,
        totalAddresses: 0,
        totalCollaborators: 0,
      });
      expect(result.current.trip?.location).toEqual({ type: 'Point', coordinates: [0, 0] });
      expect(result.current.trip?.tags).toEqual([]);
    });

    it('should derive the public visibility from the isPublic flag', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ visibility: undefined, isPublic: true }));

      const { result } = await renderLoaded();

      expect(result.current.trip?.visibility).toBe('public');
    });

    it('should promote a string collaborator to a full editor entry', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ collaborators: ['user1'] }));

      const { result } = await renderLoaded();

      expect(result.current.trip?.collaborators[0]).toEqual({
        userId: 'user1',
        role: 'editor',
        joinedAt: expect.any(Date),
        permissions: { canEdit: true, canInvite: false, canDelete: false },
      });
    });

    it('should keep the details of an object collaborator', async () => {
      mockApi.getTripById.mockResolvedValue(
        makeRawTrip({
          collaborators: [
            {
              userId: 'user2',
              role: 'viewer',
              joinedAt: '2025-02-01T00:00:00.000Z',
              permissions: { canEdit: false, canInvite: true, canDelete: false },
              invitedBy: 'owner1',
            },
          ],
        })
      );

      const { result } = await renderLoaded();

      expect(result.current.trip?.collaborators[0]).toEqual({
        userId: 'user2',
        role: 'viewer',
        joinedAt: new Date('2025-02-01T00:00:00.000Z'),
        permissions: { canEdit: false, canInvite: true, canDelete: false },
        invitedBy: 'owner1',
      });
    });

    it('should apply collaborator defaults when the object is incomplete', async () => {
      mockApi.getTripById.mockResolvedValue(makeRawTrip({ collaborators: [{ userId: 'user3' }] }));

      const { result } = await renderLoaded();

      expect(result.current.trip?.collaborators[0]).toEqual({
        userId: 'user3',
        role: 'editor',
        joinedAt: expect.any(Date),
        permissions: { canEdit: true, canInvite: false, canDelete: false },
        invitedBy: undefined,
      });
    });

    it('should map the bookings and their optional end date', async () => {
      mockApi.getBookingsByTripId.mockResolvedValue([
        makeRawBooking({ endDate: '2025-06-05T00:00:00.000Z' }),
        makeRawBooking({ _id: 'book2', endDate: undefined }),
      ]);

      const { result } = await renderLoaded();

      expect(result.current.bookings[0].endDate).toEqual(new Date('2025-06-05T00:00:00.000Z'));
      expect(result.current.bookings[1].endDate).toBeUndefined();
      expect(result.current.bookings[0].id).toBe('book1');
    });

    it('should map the addresses returned by the api', async () => {
      mockApi.getAddressesByTripId.mockResolvedValue([makeRawAddress()]);

      const { result } = await renderLoaded();

      expect(result.current.addresses[0]).toEqual(
        expect.objectContaining({ id: 'addr1', name: 'Chez Léon', tripId: 'trip1' })
      );
    });

    it('should fall back to empty lists when bookings and addresses cannot be fetched', async () => {
      mockApi.getBookingsByTripId.mockRejectedValue(new Error('boom'));
      mockApi.getAddressesByTripId.mockRejectedValue(new Error('boom'));

      const { result } = await renderLoaded();

      expect(result.current.bookings).toEqual([]);
      expect(result.current.addresses).toEqual([]);
      expect(result.current.trip?.id).toBe('trip1');
    });

    it('should log the error and stop loading when the trip cannot be fetched', async () => {
      mockApi.getTripById.mockRejectedValue(new Error('boom'));

      const { result } = await renderLoaded();

      expect(errorSpy).toHaveBeenCalledWith('Error loading trip data:', expect.any(Error));
      expect(result.current.trip).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should display the cached trip and its items before the api responds', async () => {
      mockGetTripById.mockReturnValue({ id: 'trip1', title: 'Rome (cache)' } as Trip);
      mockAllBookings = [makeBooking(), makeBooking({ id: 'book9', tripId: 'other' })];
      mockAllAddresses = [makeAddress(), makeAddress({ id: 'addr9', tripId: 'other' })];
      mockApi.getTripById.mockRejectedValue(new Error('offline'));

      const { result } = await renderLoaded();

      expect(result.current.trip?.title).toBe('Rome (cache)');
      expect(result.current.bookings.map((b) => b.id)).toEqual(['book1']);
      expect(result.current.addresses.map((a) => a.id)).toEqual(['addr1']);
    });

    it('should not seed the lists when the cache holds no item for the trip', async () => {
      mockGetTripById.mockReturnValue({ id: 'trip1', title: 'Rome (cache)' } as Trip);
      mockAllBookings = [makeBooking({ id: 'book9', tripId: 'other' })];
      mockAllAddresses = [makeAddress({ id: 'addr9', tripId: 'other' })];
      mockApi.getTripById.mockRejectedValue(new Error('offline'));

      const { result } = await renderLoaded();

      expect(result.current.bookings).toEqual([]);
      expect(result.current.addresses).toEqual([]);
    });

    it('should skip the cache when the trip is already loaded', async () => {
      const { result } = await renderLoaded();
      mockGetTripById.mockReturnValue({ id: 'trip1', title: 'Rome (cache)' } as Trip);

      await act(async () => {
        await result.current.loadTripData();
      });

      expect(result.current.trip?.title).toBe('Rome');
    });
  });

  describe('handleAddBooking', () => {
    it('should not open the booking form while the trip is unknown', () => {
      const { result } = renderHook(() => useTripData('trip1'));

      act(() => result.current.handleAddBooking());

      expect(result.current.showBookingForm).toBe(false);
    });

    it('should open the booking form once the trip is loaded', async () => {
      const { result } = await renderLoaded();

      act(() => result.current.handleAddBooking());

      expect(result.current.showBookingForm).toBe(true);
    });
  });

  describe('handleSaveBooking', () => {
    it('should append the created booking and close the form', async () => {
      const created = makeBooking({ id: 'created' });
      mockCreateBooking.mockResolvedValue(created);
      const { result } = await renderLoaded();
      act(() => result.current.setShowBookingForm(true));

      await act(async () => {
        await result.current.handleSaveBooking(makeBooking());
      });

      expect(mockCreateBooking).toHaveBeenCalledWith(expect.objectContaining({ tripId: 'trip1' }));
      expect(result.current.bookings).toEqual([created]);
      expect(result.current.showBookingForm).toBe(false);
    });

    it('should alert with the parsed api error when the creation fails', async () => {
      mockCreateBooking.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('réservation refusée');
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleSaveBooking(makeBooking());
      });

      expect(errorSpy).toHaveBeenCalledWith('Error creating booking:', expect.any(Error));
      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'réservation refusée');
    });

    it('should alert with the generic message when the creation error cannot be parsed', async () => {
      mockCreateBooking.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('');
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleSaveBooking(makeBooking());
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'tripDetails.createBookingError');
    });
  });

  describe('address navigation', () => {
    it('should navigate to the address form for a new address', async () => {
      const { result } = await renderLoaded();

      act(() => result.current.handleAddAddress());

      expect(mockNavigate).toHaveBeenCalledWith('AddressForm', { tripId: 'trip1' });
    });

    it('should navigate to the address form of an existing address', async () => {
      const { result } = await renderLoaded();

      act(() => result.current.handleEditAddress(makeAddress({ id: 'addr7' })));

      expect(mockNavigate).toHaveBeenCalledWith('AddressForm', { addressId: 'addr7' });
    });
  });

  describe('handleUpdateBooking', () => {
    it('should replace the updated booking in the list', async () => {
      mockApi.getBookingsByTripId.mockResolvedValue([makeRawBooking()]);
      mockUpdateBooking.mockResolvedValue(makeBooking({ title: 'Hôtel Rivoli' }));
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleUpdateBooking('book1', makeBooking());
      });

      expect(result.current.bookings[0].title).toBe('Hôtel Rivoli');
    });

    it('should keep the list untouched when the update returns nothing', async () => {
      mockApi.getBookingsByTripId.mockResolvedValue([makeRawBooking()]);
      mockUpdateBooking.mockResolvedValue(null);
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleUpdateBooking('book1', makeBooking());
      });

      expect(result.current.bookings[0].title).toBe('Hôtel Central');
    });

    it('should alert with the parsed api error when the update fails', async () => {
      mockUpdateBooking.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('mise à jour refusée');
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleUpdateBooking('book1', makeBooking());
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'mise à jour refusée');
    });

    it('should alert with the generic message when the update error cannot be parsed', async () => {
      mockUpdateBooking.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('');
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleUpdateBooking('book1', makeBooking());
      });

      expect(Alert.alert).toHaveBeenLastCalledWith(
        'common.error',
        'bookings.details.errorUpdateBooking'
      );
    });
  });

  describe('handleDeleteBooking', () => {
    it('should remove the deleted booking from the list', async () => {
      mockApi.getBookingsByTripId.mockResolvedValue([makeRawBooking(), makeRawBooking({ _id: 'book2' })]);
      mockDeleteBooking.mockResolvedValue(true);
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleDeleteBooking('book1');
      });

      expect(mockDeleteBooking).toHaveBeenCalledWith('book1');
      expect(result.current.bookings.map((b) => b.id)).toEqual(['book2']);
    });

    it('should alert with the parsed api error when the deletion fails', async () => {
      mockDeleteBooking.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('suppression refusée');
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleDeleteBooking('book1');
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'suppression refusée');
    });

    it('should alert with the generic message when the deletion error cannot be parsed', async () => {
      mockDeleteBooking.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('');
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleDeleteBooking('book1');
      });

      expect(Alert.alert).toHaveBeenLastCalledWith(
        'common.error',
        'bookings.details.errorDeleteBooking'
      );
    });
  });

  describe('handleDeleteAddress', () => {
    it('should remove the deleted address from the list', async () => {
      mockApi.getAddressesByTripId.mockResolvedValue([makeRawAddress(), makeRawAddress({ _id: 'addr2' })]);
      mockDeleteAddress.mockResolvedValue(true);
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleDeleteAddress('addr1');
      });

      expect(mockDeleteAddress).toHaveBeenCalledWith('addr1');
      expect(result.current.addresses.map((a) => a.id)).toEqual(['addr2']);
    });

    it('should alert with the parsed api error when the deletion fails', async () => {
      mockDeleteAddress.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('adresse verrouillée');
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleDeleteAddress('addr1');
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'adresse verrouillée');
    });

    it('should alert with the generic message when the deletion error cannot be parsed', async () => {
      mockDeleteAddress.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('');
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleDeleteAddress('addr1');
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'addresses.details.deleteConfirm');
    });
  });

  describe('handleCopyBooking', () => {
    it('should copy the booking into the current trip without its identifiers', async () => {
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

    it('should alert with the parsed api error when the copy fails', async () => {
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

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'tripDetails.createBookingError');
    });
  });

  describe('handleCopyAddress', () => {
    it('should copy the address into the current trip without its identifiers', async () => {
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

    it('should alert with the parsed api error when the copy fails', async () => {
      mockCreateAddress.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('copie refusée');
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.handleCopyAddress(makeAddress());
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'copie refusée');
    });
  });

  describe('handleValidateTrip', () => {
    it('should ask for confirmation before validating the trip', async () => {
      const { result } = await renderLoaded();

      act(() => result.current.handleValidateTrip());

      expect(Alert.alert).toHaveBeenCalledWith(
        'tripDetails.validateTrip',
        'tripDetails.validateTripMessage',
        expect.any(Array)
      );
      expect(mockValidateTrip).not.toHaveBeenCalled();
    });

    it('should store the validated trip and confirm the success', async () => {
      const validated = { id: 'trip1', title: 'Rome', status: 'validated' } as Trip;
      mockValidateTrip.mockResolvedValue(validated);
      const { result } = await renderLoaded();
      act(() => result.current.handleValidateTrip());

      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });

      expect(mockValidateTrip).toHaveBeenCalledWith('trip1');
      expect(result.current.trip).toEqual(validated);
      expect(Alert.alert).toHaveBeenLastCalledWith(
        'tripDetails.tripValidated',
        'tripDetails.tripValidatedMessage',
        expect.any(Array)
      );
    });

    it('should reset the navigation to the main screen from the success alert', async () => {
      mockValidateTrip.mockResolvedValue({ id: 'trip1' } as Trip);
      const { result } = await renderLoaded();
      act(() => result.current.handleValidateTrip());
      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });

      act(() => lastAlertButtons()[0].onPress());

      expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Main' }] });
    });

    it('should keep the current trip when the validation returns nothing', async () => {
      mockValidateTrip.mockResolvedValue(null);
      const { result } = await renderLoaded();
      act(() => result.current.handleValidateTrip());

      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });

      expect(result.current.trip?.status).toBe('draft');
    });

    it('should alert with the parsed api error when the validation fails', async () => {
      mockValidateTrip.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('validation refusée');
      const { result } = await renderLoaded();
      act(() => result.current.handleValidateTrip());

      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });

      expect(errorSpy).toHaveBeenCalledWith('Error validating trip:', expect.any(Error));
      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'validation refusée');
    });

    it('should alert with the generic message when the validation error cannot be parsed', async () => {
      mockValidateTrip.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('');
      const { result } = await renderLoaded();
      act(() => result.current.handleValidateTrip());

      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'tripDetails.validateError');
    });
  });

  describe('items available for copy', () => {
    it('should expose only the bookings and addresses of the other trips', () => {
      mockAllBookings = [makeBooking(), makeBooking({ id: 'book9', tripId: 'other' })];
      mockAllAddresses = [makeAddress(), makeAddress({ id: 'addr9', tripId: 'other' })];

      const { result } = renderHook(() => useTripData('trip1'));

      expect(result.current.otherBookings.map((b) => b.id)).toEqual(['book9']);
      expect(result.current.otherAddresses.map((a) => a.id)).toEqual(['addr9']);
    });
  });
});
