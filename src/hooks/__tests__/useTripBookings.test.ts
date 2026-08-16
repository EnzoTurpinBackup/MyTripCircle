import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import useTripBookings from '../useTripBookings';
import { parseApiError } from '../../utils/i18n';
import type { Booking } from '../../types';

jest.mock('../../utils/i18n', () => ({
  parseApiError: jest.fn(),
}));

const mockParseApiError = parseApiError as jest.Mock;

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'book1',
  tripId: 'trip1',
  type: 'hotel',
  title: 'Hôtel Central',
  date: new Date('2025-06-01T00:00:00Z'),
  status: 'pending',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

type BookingPayload = Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>;

const makeBookingPayload = (overrides: Partial<BookingPayload> = {}): BookingPayload => {
  const { id, createdAt, updatedAt, ...payload } = makeBooking();
  return { ...payload, ...overrides };
};

const t = (key: string) => key;

const setup = () => {
  const createBooking = jest.fn();
  const updateBooking = jest.fn();
  const deleteBooking = jest.fn();
  const { result } = renderHook(() =>
    useTripBookings({ tripId: 'trip1', createBooking, updateBooking, deleteBooking, t })
  );
  return { result, createBooking, updateBooking, deleteBooking };
};

/** Récupère le bouton de confirmation de la dernière Alert affichée. */
const lastAlertConfirmButton = () => {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  return calls[calls.length - 1][2][1];
};

describe('useTripBookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockParseApiError.mockReturnValue('erreur api');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should start with an empty booking list and a closed form', () => {
    const { result } = setup();

    expect(result.current.bookings).toEqual([]);
    expect(result.current.showBookingForm).toBe(false);
    expect(result.current.editingBookingIndex).toBeNull();
  });

  it('should open the form in creation mode when adding', () => {
    const { result } = setup();
    act(() => result.current.handleEditBooking(2));

    act(() => result.current.handleAddBooking());

    expect(result.current.showBookingForm).toBe(true);
    expect(result.current.editingBookingIndex).toBeNull();
  });

  it('should open the form on the selected index when editing', () => {
    const { result } = setup();

    act(() => result.current.handleEditBooking(1));

    expect(result.current.showBookingForm).toBe(true);
    expect(result.current.editingBookingIndex).toBe(1);
  });

  it('should ask for confirmation before deleting a booking', () => {
    const { result } = setup();
    act(() => result.current.setBookings([makeBooking()]));

    act(() => result.current.handleDeleteBooking(0));

    expect(Alert.alert).toHaveBeenCalledWith('common.confirm', 'bookings.deleteConfirm', [
      { text: 'common.cancel', style: 'cancel' },
      expect.objectContaining({ text: 'common.ok', style: 'destructive' }),
    ]);
  });

  it('should delete the booking remotely and locally when deletion is confirmed', async () => {
    const { result, deleteBooking } = setup();
    deleteBooking.mockResolvedValue(true);
    act(() => result.current.setBookings([makeBooking(), makeBooking({ id: 'book2' })]));
    act(() => result.current.handleDeleteBooking(0));

    await act(async () => {
      await lastAlertConfirmButton().onPress();
    });

    expect(deleteBooking).toHaveBeenCalledWith('book1');
    expect(result.current.bookings.map((b) => b.id)).toEqual(['book2']);
  });

  it('should only remove the booking locally when it has no id', async () => {
    const { result, deleteBooking } = setup();
    act(() => result.current.setBookings([makeBooking({ id: '' })]));
    act(() => result.current.handleDeleteBooking(0));

    await act(async () => {
      await lastAlertConfirmButton().onPress();
    });

    expect(deleteBooking).not.toHaveBeenCalled();
    expect(result.current.bookings).toEqual([]);
  });

  it('should create the booking and append it when no booking is being edited', async () => {
    const { result, createBooking } = setup();
    const created = makeBooking({ id: 'created' });
    createBooking.mockResolvedValue(created);

    await act(async () => {
      await result.current.handleSaveBooking(makeBookingPayload({ title: 'Nouveau' }));
    });

    expect(createBooking).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nouveau', tripId: 'trip1' }));
    expect(result.current.bookings).toEqual([created]);
    expect(result.current.showBookingForm).toBe(false);
  });

  it('should update the edited booking in place when it has an id', async () => {
    const { result, updateBooking } = setup();
    updateBooking.mockResolvedValue(makeBooking());
    act(() => result.current.setBookings([makeBooking(), makeBooking({ id: 'book2', title: 'Ancien' })]));
    act(() => result.current.handleEditBooking(1));

    await act(async () => {
      await result.current.handleSaveBooking(makeBookingPayload({ title: 'Renommé' }));
    });

    expect(updateBooking).toHaveBeenCalledWith('book2', expect.objectContaining({ title: 'Renommé' }));
    expect(result.current.bookings[1].title).toBe('Renommé');
    expect(result.current.bookings[1].id).toBe('book2');
    expect(result.current.bookings[0].title).toBe('Hôtel Central');
  });

  it('should skip the remote update when the edited booking has no id', async () => {
    const { result, updateBooking } = setup();
    act(() => result.current.setBookings([makeBooking({ id: '', title: 'Brouillon' })]));
    act(() => result.current.handleEditBooking(0));

    await act(async () => {
      await result.current.handleSaveBooking(makeBookingPayload({ title: 'Renommé' }));
    });

    expect(updateBooking).not.toHaveBeenCalled();
    expect(result.current.bookings[0].title).toBe('Brouillon');
    expect(result.current.showBookingForm).toBe(false);
  });

  it('should alert with the parsed api error when saving fails', async () => {
    const { result, createBooking } = setup();
    createBooking.mockRejectedValue(new Error('boom'));
    mockParseApiError.mockReturnValue('réservation invalide');

    await act(async () => {
      await result.current.handleSaveBooking(makeBookingPayload());
    });

    expect(Alert.alert).toHaveBeenCalledWith('common.error', 'réservation invalide');
  });

  it('should alert with the generic message when the api error cannot be parsed', async () => {
    const { result, createBooking } = setup();
    createBooking.mockRejectedValue(new Error('boom'));
    mockParseApiError.mockReturnValue('');

    await act(async () => {
      await result.current.handleSaveBooking(makeBookingPayload());
    });

    expect(Alert.alert).toHaveBeenCalledWith('common.error', 'editTrip.saveError');
  });

  it('should close the form and reset the edited index', () => {
    const { result } = setup();
    act(() => result.current.handleEditBooking(0));

    act(() => result.current.closeBookingForm());

    expect(result.current.showBookingForm).toBe(false);
    expect(result.current.editingBookingIndex).toBeNull();
  });
});
