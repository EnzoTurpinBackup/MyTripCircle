import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { useTripDetails } from '../useTripDetails';
import { useTripData } from '../useTripData';
import { useTripPermissions } from '../useTripPermissions';
import { useTripCountdown } from '../useTripCountdown';
import type { Trip } from '../../types';

const mockNavigate = jest.fn();
const mockLoadTripData = jest.fn();

let mockUser: { id: string } | null = { id: 'me' };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  // Reproduit le comportement de React Navigation : le callback est rejoué à
  // chaque fois que ses dépendances changent, comme lors d'un retour à l'écran.
  useFocusEffect: (callback: () => void) =>
    (require('react') as typeof React).useEffect(callback, [callback]),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('../useTripData', () => ({ useTripData: jest.fn() }));
jest.mock('../useTripPermissions', () => ({ useTripPermissions: jest.fn() }));
jest.mock('../useTripCountdown', () => ({ useTripCountdown: jest.fn() }));

const mockUseTripData = useTripData as jest.Mock;
const mockUseTripPermissions = useTripPermissions as jest.Mock;
const mockUseTripCountdown = useTripCountdown as jest.Mock;

const trip = { id: 'trip1', title: 'Rome' } as Trip;

const tripDataValue = {
  trip,
  bookings: [],
  addresses: [],
  loading: false,
  showBookingForm: false,
  setShowBookingForm: jest.fn(),
  loadTripData: mockLoadTripData,
  handleAddBooking: jest.fn(),
  handleSaveBooking: jest.fn(),
  handleCopyBooking: jest.fn(),
  handleCopyAddress: jest.fn(),
  handleAddAddress: jest.fn(),
  handleEditAddress: jest.fn(),
  handleUpdateBooking: jest.fn(),
  handleDeleteBooking: jest.fn(),
  handleDeleteAddress: jest.fn(),
  handleValidateTrip: jest.fn(),
  otherBookings: [],
  otherAddresses: [],
};

describe('useTripDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'me' };
    mockUseTripData.mockReturnValue(tripDataValue);
    mockUseTripPermissions.mockReturnValue({
      isOwner: true,
      userCollaborator: undefined,
      canInvite: true,
      totalMembers: 3,
      collaboratorUsers: [],
    });
    mockUseTripCountdown.mockReturnValue({
      countdown: { days: 2 },
      progressPercent: 40,
      durationDays: 7,
      daysPassed: 3,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should reload the trip data when the screen gains focus', () => {
    renderHook(() => useTripDetails('trip1'));

    expect(mockUseTripData).toHaveBeenCalledWith('trip1');
    expect(mockLoadTripData).toHaveBeenCalledTimes(1);
  });

  it('should open on the bookings tab without a toast', () => {
    const { result } = renderHook(() => useTripDetails('trip1'));

    expect(result.current.activeTab).toBe('bookings');
    expect(result.current.showToast).toBe(false);
  });

  it('should compute the permissions for the authenticated user', () => {
    renderHook(() => useTripDetails('trip1'));

    expect(mockUseTripPermissions).toHaveBeenCalledWith(trip, 'me');
  });

  it('should compute the permissions without a user id when nobody is authenticated', () => {
    mockUser = null;

    renderHook(() => useTripDetails('trip1'));

    expect(mockUseTripPermissions).toHaveBeenCalledWith(trip, undefined);
  });

  it('should expose the data, permissions and countdown of the trip', () => {
    const { result } = renderHook(() => useTripDetails('trip1'));

    expect(result.current.trip).toBe(trip);
    expect(result.current.loading).toBe(false);
    expect(result.current.handleValidateTrip).toBe(tripDataValue.handleValidateTrip);
    expect(result.current.isOwner).toBe(true);
    expect(result.current.totalMembers).toBe(3);
    expect(result.current.countdown).toEqual({ days: 2 });
    expect(result.current.progressPercent).toBe(40);
    expect(result.current.durationDays).toBe(7);
    expect(result.current.daysPassed).toBe(3);
  });

  it('should change the active tab', () => {
    const { result } = renderHook(() => useTripDetails('trip1'));

    act(() => result.current.setActiveTab('members'));

    expect(result.current.activeTab).toBe('members');
  });

  it('should navigate to the invitation screen of the trip', () => {
    const { result } = renderHook(() => useTripDetails('trip1'));

    act(() => result.current.handleInviteFriends());

    expect(mockNavigate).toHaveBeenCalledWith('InviteFriends', { tripId: 'trip1' });
  });

  describe('toast', () => {
    it('should display the toast when the screen is opened with the toast flag', () => {
      jest.spyOn(Animated, 'sequence').mockReturnValue({ start: jest.fn() } as never);

      const { result } = renderHook(() => useTripDetails('trip1', true));

      expect(result.current.showToast).toBe(true);
      expect(Animated.sequence).toHaveBeenCalled();
    });

    it('should hide the toast once its animation ends', () => {
      jest.spyOn(Animated, 'sequence').mockReturnValue({
        start: (onComplete?: () => void) => onComplete?.(),
      } as never);

      const { result } = renderHook(() => useTripDetails('trip1', true));

      expect(result.current.showToast).toBe(false);
    });

    it('should let the screen dismiss the toast manually', () => {
      jest.spyOn(Animated, 'sequence').mockReturnValue({ start: jest.fn() } as never);
      const { result } = renderHook(() => useTripDetails('trip1', true));

      act(() => result.current.setShowToast(false));

      expect(result.current.showToast).toBe(false);
    });
  });
});
