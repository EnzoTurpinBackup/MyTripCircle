import { renderHook, act } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import { useCreateTrip } from '../useCreateTrip';
import { parseApiError } from '../../utils/i18n';
import { fetchDestinationPhotoUrl } from '../../utils/destinationPhoto';
import type { Trip } from '../../types';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();
const mockCreateTrip = jest.fn();
const mockCanCreateTrip = jest.fn();

let mockUser: { id: string } | null = { id: 'me' };
let mockTrips: Array<Pick<Trip, 'ownerId'>> = [];

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace, goBack: mockGoBack }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../contexts/TripsContext', () => ({
  useTrips: () => ({ createTrip: mockCreateTrip, trips: mockTrips }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('../../contexts/SubscriptionContext', () => ({
  useSubscription: () => ({ canCreateTrip: mockCanCreateTrip }),
}));

jest.mock('../../utils/i18n', () => ({
  parseApiError: jest.fn(),
}));

jest.mock('../../utils/destinationPhoto', () => ({
  fetchDestinationPhotoUrl: jest.fn(),
}));

const mockParseApiError = parseApiError as jest.Mock;
const mockFetchPhoto = fetchDestinationPhotoUrl as jest.Mock;

const NOW = new Date('2025-05-01T09:00:00.000Z');

/** Récupère les boutons de la dernière Alert affichée. */
const lastAlertButtons = () => {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  return calls[calls.length - 1][2];
};

const fillValidForm = (result: { current: ReturnType<typeof useCreateTrip> }) => {
  act(() => result.current.handleInputChange('title', 'Rome'));
  act(() => result.current.handleInputChange('destination', 'Italie'));
};

describe('useCreateTrip', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUser = { id: 'me' };
    mockTrips = [];
    mockCanCreateTrip.mockReturnValue(true);
    mockCreateTrip.mockResolvedValue({ id: 'trip-new' });
    mockFetchPhoto.mockResolvedValue(null);
    mockParseApiError.mockReturnValue('erreur api');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should initialize the form with an empty private trip ending seven days later', () => {
    const { result } = renderHook(() => useCreateTrip());

    expect(result.current.formData.title).toBe('');
    expect(result.current.formData.destination).toBe('');
    expect(result.current.formData.isPublic).toBe(false);
    expect(result.current.formData.visibility).toBe('private');
    expect(result.current.formData.startDate).toEqual(NOW);
    expect(result.current.formData.endDate).toEqual(new Date('2025-05-08T09:00:00.000Z'));
    expect(result.current.loading).toBe(false);
    expect(result.current.dateError).toBeNull();
  });

  it('should update the edited field', () => {
    const { result } = renderHook(() => useCreateTrip());

    act(() => result.current.handleInputChange('title', 'Rome antique'));

    expect(result.current.formData.title).toBe('Rome antique');
  });

  describe('cover photo auto-fetch', () => {
    it('should not look up a photo when the destination is shorter than three characters', () => {
      const { result } = renderHook(() => useCreateTrip());

      act(() => result.current.handleInputChange('destination', 'Ro'));
      act(() => jest.advanceTimersByTime(600));

      expect(mockFetchPhoto).not.toHaveBeenCalled();
    });

    it('should look up a photo once the debounce elapses', async () => {
      mockFetchPhoto.mockResolvedValue('https://photos/rome.jpg');
      const { result } = renderHook(() => useCreateTrip());
      act(() => result.current.handleInputChange('destination', 'Rome'));

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(mockFetchPhoto).toHaveBeenCalledWith('Rome');
    });

    it('should debounce consecutive destination edits into a single lookup', async () => {
      const { result } = renderHook(() => useCreateTrip());
      act(() => result.current.handleInputChange('destination', 'Rom'));
      act(() => jest.advanceTimersByTime(300));
      act(() => result.current.handleInputChange('destination', 'Rome'));

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(mockFetchPhoto).toHaveBeenCalledTimes(1);
      expect(mockFetchPhoto).toHaveBeenCalledWith('Rome');
    });

    it('should cancel the pending lookup when the hook unmounts', () => {
      const { result, unmount } = renderHook(() => useCreateTrip());
      act(() => result.current.handleInputChange('destination', 'Rome'));

      unmount();
      act(() => jest.advanceTimersByTime(600));

      expect(mockFetchPhoto).not.toHaveBeenCalled();
    });
  });

  describe('handleDateChange', () => {
    it('should ignore a change without a selected date', () => {
      const { result } = renderHook(() => useCreateTrip());

      act(() => result.current.handleDateChange({}, undefined, 'start'));

      expect(result.current.formData.startDate).toEqual(NOW);
    });

    it('should ignore an invalid selected date', () => {
      const { result } = renderHook(() => useCreateTrip());

      act(() => result.current.handleDateChange({}, new Date('nope'), 'start'));

      expect(result.current.formData.startDate).toEqual(NOW);
    });

    it('should keep the end date when the new start date is earlier', () => {
      const { result } = renderHook(() => useCreateTrip());

      act(() => result.current.handleDateChange({}, new Date('2025-05-02T00:00:00.000Z'), 'start'));

      expect(result.current.formData.startDate).toEqual(new Date('2025-05-02T00:00:00.000Z'));
      expect(result.current.formData.endDate).toEqual(new Date('2025-05-08T09:00:00.000Z'));
    });

    it('should push the end date forward when the new start date is later', () => {
      const { result } = renderHook(() => useCreateTrip());

      act(() => result.current.handleDateChange({}, new Date('2025-06-01T00:00:00.000Z'), 'start'));

      expect(result.current.formData.endDate).toEqual(new Date('2025-06-01T00:00:00.000Z'));
      expect(result.current.dateError).toBeNull();
    });

    it('should accept an end date after the start date', () => {
      const { result } = renderHook(() => useCreateTrip());

      act(() => result.current.handleDateChange({}, new Date('2025-05-20T00:00:00.000Z'), 'end'));

      expect(result.current.formData.endDate).toEqual(new Date('2025-05-20T00:00:00.000Z'));
      expect(result.current.dateError).toBeNull();
    });

    it('should report an error when the end date precedes the start date', () => {
      const { result } = renderHook(() => useCreateTrip());

      act(() => result.current.handleDateChange({}, new Date('2025-04-01T00:00:00.000Z'), 'end'));

      expect(result.current.dateError).toBe('createTrip.invalidDates');
    });

    it('should default to the start date when no type is given', () => {
      const { result } = renderHook(() => useCreateTrip());

      act(() => result.current.handleDateChange({}, new Date('2025-05-02T00:00:00.000Z')));

      expect(result.current.formData.startDate).toEqual(new Date('2025-05-02T00:00:00.000Z'));
    });

    it('should close the start date picker on android', () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const { result } = renderHook(() => useCreateTrip());
      act(() => result.current.setShowStartDatePicker(true));

      act(() => result.current.handleDateChange({}, new Date('2025-05-02T00:00:00.000Z'), 'start'));

      expect(result.current.showStartDatePicker).toBe(false);
    });

    it('should close the end date picker on android', () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const { result } = renderHook(() => useCreateTrip());
      act(() => result.current.setShowEndDatePicker(true));

      act(() => result.current.handleDateChange({}, new Date('2025-05-20T00:00:00.000Z'), 'end'));

      expect(result.current.showEndDatePicker).toBe(false);
    });

    it('should keep the picker open on ios', () => {
      jest.replaceProperty(Platform, 'OS', 'ios');
      const { result } = renderHook(() => useCreateTrip());
      act(() => result.current.setShowStartDatePicker(true));

      act(() => result.current.handleDateChange({}, new Date('2025-05-02T00:00:00.000Z'), 'start'));

      expect(result.current.showStartDatePicker).toBe(true);
    });
  });

  describe('handleVisibilityChange', () => {
    it('should mark the trip as public when the public visibility is picked', () => {
      const { result } = renderHook(() => useCreateTrip());
      act(() => result.current.setShowVisibilityPicker(true));

      act(() => result.current.handleVisibilityChange('public'));

      expect(result.current.formData.visibility).toBe('public');
      expect(result.current.formData.isPublic).toBe(true);
      expect(result.current.showVisibilityPicker).toBe(false);
    });

    it('should keep the trip private when the friends visibility is picked', () => {
      const { result } = renderHook(() => useCreateTrip());

      act(() => result.current.handleVisibilityChange('friends'));

      expect(result.current.formData.visibility).toBe('friends');
      expect(result.current.formData.isPublic).toBe(false);
    });
  });

  describe('handleCreate', () => {
    it('should refuse to create a trip without a title', async () => {
      const { result } = renderHook(() => useCreateTrip());

      await act(async () => {
        await result.current.handleCreate();
      });

      expect(Alert.alert).toHaveBeenCalledWith('createTrip.error', 'createTrip.titleRequired');
      expect(mockCreateTrip).not.toHaveBeenCalled();
    });

    it('should refuse to create a trip without a destination', async () => {
      const { result } = renderHook(() => useCreateTrip());
      act(() => result.current.handleInputChange('title', 'Rome'));

      await act(async () => {
        await result.current.handleCreate();
      });

      expect(Alert.alert).toHaveBeenCalledWith('createTrip.error', 'createTrip.destinationRequired');
      expect(mockCreateTrip).not.toHaveBeenCalled();
    });

    it('should refuse to create a trip ending before it starts', async () => {
      const { result } = renderHook(() => useCreateTrip());
      fillValidForm(result);
      act(() => result.current.handleDateChange({}, new Date('2025-04-01T00:00:00.000Z'), 'end'));

      await act(async () => {
        await result.current.handleCreate();
      });

      expect(Alert.alert).toHaveBeenCalledWith('createTrip.error', 'createTrip.invalidDates');
      expect(mockCreateTrip).not.toHaveBeenCalled();
    });

    it('should do nothing when no user is authenticated', async () => {
      mockUser = null;
      const { result } = renderHook(() => useCreateTrip());
      fillValidForm(result);

      await act(async () => {
        await result.current.handleCreate();
      });

      expect(mockCreateTrip).not.toHaveBeenCalled();
      expect(mockCanCreateTrip).not.toHaveBeenCalled();
    });

    it('should offer an upgrade when the trip quota is reached', async () => {
      mockTrips = [{ ownerId: 'me' }, { ownerId: 'someone-else' }];
      mockCanCreateTrip.mockReturnValue(false);
      const { result } = renderHook(() => useCreateTrip());
      fillValidForm(result);

      await act(async () => {
        await result.current.handleCreate();
      });

      expect(mockCanCreateTrip).toHaveBeenCalledWith(1);
      expect(Alert.alert).toHaveBeenCalledWith(
        'subscription.tripLimitTitle',
        'subscription.tripLimitBody',
        expect.any(Array)
      );
      expect(mockCreateTrip).not.toHaveBeenCalled();
    });

    it('should navigate to the subscription screen from the quota alert', async () => {
      mockCanCreateTrip.mockReturnValue(false);
      const { result } = renderHook(() => useCreateTrip());
      fillValidForm(result);
      await act(async () => {
        await result.current.handleCreate();
      });

      act(() => lastAlertButtons()[1].onPress());

      expect(mockNavigate).toHaveBeenCalledWith('Subscription');
    });

    it('should create the trip with the trimmed form values', async () => {
      const { result } = renderHook(() => useCreateTrip());
      act(() => result.current.handleInputChange('title', '  Rome  '));
      act(() => result.current.handleInputChange('description', '  Antiquité  '));
      act(() => result.current.handleInputChange('destination', '  Italie  '));

      await act(async () => {
        await result.current.handleCreate();
      });

      expect(mockCreateTrip).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Rome',
          description: 'Antiquité',
          destination: 'Italie',
          status: 'draft',
          coverImage: undefined,
          collaborators: [],
        })
      );
      expect(result.current.loading).toBe(false);
    });

    it('should attach the auto-fetched cover image to the created trip', async () => {
      mockFetchPhoto.mockResolvedValue('https://photos/rome.jpg');
      const { result } = renderHook(() => useCreateTrip());
      act(() => result.current.handleInputChange('title', 'Rome'));
      act(() => result.current.handleInputChange('destination', 'Italie'));
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await act(async () => {
        await result.current.handleCreate();
      });

      expect(mockCreateTrip).toHaveBeenCalledWith(
        expect.objectContaining({ coverImage: 'https://photos/rome.jpg' })
      );
    });

    it('should open the created trip from the success alert', async () => {
      const { result } = renderHook(() => useCreateTrip());
      fillValidForm(result);
      await act(async () => {
        await result.current.handleCreate();
      });

      act(() => lastAlertButtons()[0].onPress());

      expect(Alert.alert).toHaveBeenCalledWith(
        'createTrip.success',
        'createTrip.successMessage',
        expect.any(Array)
      );
      expect(mockReplace).toHaveBeenCalledWith('TripDetails', {
        tripId: 'trip-new',
        showValidateButton: true,
      });
    });

    it('should alert with the parsed api error when the creation fails', async () => {
      mockCreateTrip.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('quota dépassé');
      const { result } = renderHook(() => useCreateTrip());
      fillValidForm(result);

      await act(async () => {
        await result.current.handleCreate();
      });

      expect(errorSpy).toHaveBeenCalledWith('[useCreateTrip] handleCreate - Error:', expect.any(Error));
      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'quota dépassé');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('handleCancel', () => {
    it('should ask for confirmation before discarding the form', () => {
      const { result } = renderHook(() => useCreateTrip());

      act(() => result.current.handleCancel());

      expect(Alert.alert).toHaveBeenCalledWith(
        'createTrip.cancelTitle',
        'createTrip.cancelMessage',
        expect.any(Array)
      );
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('should go back when the discard is confirmed', () => {
      const { result } = renderHook(() => useCreateTrip());
      act(() => result.current.handleCancel());

      act(() => lastAlertButtons()[1].onPress());

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
