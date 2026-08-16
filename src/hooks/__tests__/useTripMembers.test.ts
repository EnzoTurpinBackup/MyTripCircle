import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useTripMembers, type CollabInfo } from '../useTripMembers';
import ApiService from '../../services/ApiService';
import { parseApiError } from '../../utils/i18n';

const mockNavigate = jest.fn();
const mockRefreshData = jest.fn();
const mockSheetOpen = jest.fn();
const mockSheetClose = jest.fn((onComplete?: () => void) => onComplete?.());

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../contexts/TripsContext', () => ({
  useTrips: () => ({ refreshData: mockRefreshData }),
}));

jest.mock('../useBottomSheet', () => ({
  useBottomSheet: () => ({ open: mockSheetOpen, close: mockSheetClose }),
}));

jest.mock('../../utils/i18n', () => ({
  parseApiError: jest.fn(),
}));

jest.mock('../../services/ApiService', () => ({
  __esModule: true,
  default: {
    removeTripCollaborator: jest.fn(),
    transferTripOwnership: jest.fn(),
  },
}));

const mockApi = ApiService as unknown as {
  removeTripCollaborator: jest.Mock;
  transferTripOwnership: jest.Mock;
};
const mockParseApiError = parseApiError as jest.Mock;

const makeMember = (overrides: Partial<CollabInfo> = {}): CollabInfo => ({
  userId: 'user1',
  name: 'Alice',
  isOwner: false,
  ...overrides,
});

/** Récupère le bouton de confirmation (2e bouton) de la dernière Alert affichée. */
const lastAlertConfirmButton = () => {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  return calls[calls.length - 1][2][1];
};

const setup = () => {
  const onRefresh = jest.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() => useTripMembers('trip1', onRefresh));
  return { result, onRefresh };
};

describe('useTripMembers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockParseApiError.mockReturnValue('erreur api');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should start with no selected member and no action running', () => {
    const { result } = setup();

    expect(result.current.selectedMember).toBeNull();
    expect(result.current.actionLoading).toBe(false);
  });

  it('should select the member and open the bottom sheet', () => {
    const { result } = setup();

    act(() => result.current.openSheet(makeMember()));

    expect(result.current.selectedMember).toEqual(makeMember());
    expect(mockSheetOpen).toHaveBeenCalledTimes(1);
  });

  it('should clear the selected member once the sheet is closed', () => {
    const { result } = setup();
    act(() => result.current.openSheet(makeMember()));

    act(() => result.current.closeSheet());

    expect(mockSheetClose).toHaveBeenCalledTimes(1);
    expect(result.current.selectedMember).toBeNull();
  });

  describe('handleRemoveMember', () => {
    it('should do nothing when no member is selected', () => {
      const { result } = setup();

      act(() => result.current.handleRemoveMember());

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should ask for confirmation and close the sheet when a member is selected', () => {
      const { result } = setup();
      act(() => result.current.openSheet(makeMember()));

      act(() => result.current.handleRemoveMember());

      expect(mockSheetClose).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'inviteFriends.removeTitle',
        'inviteFriends.removeMsg',
        [
          { text: 'common.cancel', style: 'cancel' },
          expect.objectContaining({ text: 'inviteFriends.removeConfirm', style: 'destructive' }),
        ]
      );
    });

    it('should remove the collaborator and refresh the data when confirmed', async () => {
      const { result, onRefresh } = setup();
      mockApi.removeTripCollaborator.mockResolvedValue(true);
      act(() => result.current.openSheet(makeMember()));
      act(() => result.current.handleRemoveMember());

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(mockApi.removeTripCollaborator).toHaveBeenCalledWith('trip1', 'user1');
      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(mockRefreshData).toHaveBeenCalledTimes(1);
      expect(result.current.actionLoading).toBe(false);
    });

    it('should alert with the parsed api error when the removal fails', async () => {
      const { result } = setup();
      mockApi.removeTripCollaborator.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('membre introuvable');
      act(() => result.current.openSheet(makeMember()));
      act(() => result.current.handleRemoveMember());

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'membre introuvable');
      expect(result.current.actionLoading).toBe(false);
    });

    it('should alert with the generic message when the removal error cannot be parsed', async () => {
      const { result } = setup();
      mockApi.removeTripCollaborator.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('');
      act(() => result.current.openSheet(makeMember()));
      act(() => result.current.handleRemoveMember());

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'inviteFriends.removeError');
    });
  });

  describe('handleTransferOwnership', () => {
    it('should do nothing when no member is selected', () => {
      const { result } = setup();

      act(() => result.current.handleTransferOwnership());

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should transfer ownership and refresh the data when confirmed', async () => {
      const { result, onRefresh } = setup();
      mockApi.transferTripOwnership.mockResolvedValue(true);
      act(() => result.current.openSheet(makeMember()));
      act(() => result.current.handleTransferOwnership());

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(mockApi.transferTripOwnership).toHaveBeenCalledWith('trip1', 'user1');
      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(mockRefreshData).toHaveBeenCalledTimes(1);
    });

    it('should alert with the parsed api error when the transfer fails', async () => {
      const { result } = setup();
      mockApi.transferTripOwnership.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('transfert impossible');
      act(() => result.current.openSheet(makeMember()));
      act(() => result.current.handleTransferOwnership());

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'transfert impossible');
    });

    it('should alert with the generic message when the transfer error cannot be parsed', async () => {
      const { result } = setup();
      mockApi.transferTripOwnership.mockRejectedValue(new Error('boom'));
      mockParseApiError.mockReturnValue('');
      act(() => result.current.openSheet(makeMember()));
      act(() => result.current.handleTransferOwnership());

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'inviteFriends.transferError');
    });
  });

  describe('handleViewProfile', () => {
    it('should do nothing when no member is selected', () => {
      const { result } = setup();

      act(() => result.current.handleViewProfile());

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should navigate to the friend profile of the selected member', () => {
      const { result } = setup();
      act(() => result.current.openSheet(makeMember({ userId: 'user9', name: 'Bob' })));

      act(() => result.current.handleViewProfile());

      expect(mockNavigate).toHaveBeenCalledWith('FriendProfile', {
        friendId: 'user9',
        friendName: 'Bob',
      });
    });
  });
});
