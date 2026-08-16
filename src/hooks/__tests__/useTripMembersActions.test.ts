import { renderHook, act } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import { useTripMembersActions } from '../useTripMembersActions';
import ApiService from '../../services/ApiService';
import type { MemberInfo } from '../useTripMembersData';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../services/ApiService', () => ({
  __esModule: true,
  default: {
    getTripInvitationLink: jest.fn(),
    cancelInvitation: jest.fn(),
    removeTripCollaborator: jest.fn(),
    transferTripOwnership: jest.fn(),
  },
}));

const mockApi = ApiService as unknown as {
  getTripInvitationLink: jest.Mock;
  cancelInvitation: jest.Mock;
  removeTripCollaborator: jest.Mock;
  transferTripOwnership: jest.Mock;
};

const makeMember = (overrides: Partial<MemberInfo> = {}): MemberInfo => ({
  userId: 'user1',
  name: 'Alice',
  role: 'editor',
  status: 'active',
  ...overrides,
});

/** Récupère le bouton de confirmation (2e bouton) de la dernière Alert affichée. */
const lastAlertConfirmButton = () => {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  return calls[calls.length - 1][2][1];
};

const setup = () => {
  const onSuccess = jest.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() => useTripMembersActions('trip1', onSuccess));
  return { result, onSuccess };
};

describe('useTripMembersActions', () => {
  let shareSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('handleShareLink', () => {
    it('should not open the share sheet when the link is empty', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleShareLink('');
      });

      expect(shareSpy).not.toHaveBeenCalled();
    });

    it('should share the invitation link when one is provided', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleShareLink('https://mtc.app/join/abc');
      });

      expect(shareSpy).toHaveBeenCalledWith({
        message: 'tripMembers.shareMsg',
        url: 'https://mtc.app/join/abc',
      });
    });

    it('should warn without throwing when sharing is cancelled', async () => {
      const { result } = setup();
      shareSpy.mockRejectedValue(new Error('dismissed'));

      await act(async () => {
        await result.current.handleShareLink('https://mtc.app/join/abc');
      });

      expect(warnSpy).toHaveBeenCalledWith(
        '[useTripMembersActions] Partage annulé ou échoué:',
        expect.any(Error)
      );
    });

    it('should stay silent when sharing fails outside development', async () => {
      const originalDev = (global as { __DEV__: boolean }).__DEV__;
      (global as { __DEV__: boolean }).__DEV__ = false;
      const { result } = setup();
      shareSpy.mockRejectedValue(new Error('dismissed'));

      await act(async () => {
        await result.current.handleShareLink('https://mtc.app/join/abc');
      });

      expect(warnSpy).not.toHaveBeenCalled();
      (global as { __DEV__: boolean }).__DEV__ = originalDev;
    });
  });

  describe('handleRenewLink', () => {
    it('should ask for confirmation before renewing the link', () => {
      const { result } = setup();

      act(() => result.current.handleRenewLink({ setInviteLink: jest.fn(), setLinkExpiry: jest.fn() }));

      expect(Alert.alert).toHaveBeenCalledWith('tripMembers.renewTitle', 'tripMembers.renewMsg', [
        { text: 'common.cancel', style: 'cancel' },
        expect.objectContaining({ text: 'tripMembers.renewConfirm' }),
      ]);
    });

    it('should store the renewed link with a seven day expiry when confirmed', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-03-10T12:00:00Z'));
      const { result } = setup();
      const setInviteLink = jest.fn();
      const setLinkExpiry = jest.fn();
      mockApi.getTripInvitationLink.mockResolvedValue({ link: 'https://mtc.app/join/new' });
      act(() => result.current.handleRenewLink({ setInviteLink, setLinkExpiry }));

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(mockApi.getTripInvitationLink).toHaveBeenCalledWith('trip1', true);
      expect(setInviteLink).toHaveBeenCalledWith('https://mtc.app/join/new');
      expect(setLinkExpiry).toHaveBeenCalledWith(new Date('2025-03-17T12:00:00Z'));
    });

    it('should store an empty link when the api returns no link', async () => {
      const { result } = setup();
      const setInviteLink = jest.fn();
      mockApi.getTripInvitationLink.mockResolvedValue({});
      act(() => result.current.handleRenewLink({ setInviteLink, setLinkExpiry: jest.fn() }));

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(setInviteLink).toHaveBeenCalledWith('');
    });

    it('should alert with the renew error when the api call fails', async () => {
      const { result } = setup();
      mockApi.getTripInvitationLink.mockRejectedValue(new Error('boom'));
      act(() => result.current.handleRenewLink({ setInviteLink: jest.fn(), setLinkExpiry: jest.fn() }));

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'tripMembers.renewError');
    });

    it('should stay silent about the renew failure outside development', async () => {
      const originalDev = (global as { __DEV__: boolean }).__DEV__;
      (global as { __DEV__: boolean }).__DEV__ = false;
      const { result } = setup();
      mockApi.getTripInvitationLink.mockRejectedValue(new Error('boom'));
      act(() => result.current.handleRenewLink({ setInviteLink: jest.fn(), setLinkExpiry: jest.fn() }));

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(warnSpy).not.toHaveBeenCalled();
      (global as { __DEV__: boolean }).__DEV__ = originalDev;
    });
  });

  describe('handleCancelInvitation', () => {
    it('should cancel the invitation and refresh when confirmed', async () => {
      const { result, onSuccess } = setup();
      mockApi.cancelInvitation.mockResolvedValue(true);
      act(() => result.current.handleCancelInvitation(makeMember({ invitationId: 'inv1' })));

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(mockApi.cancelInvitation).toHaveBeenCalledWith('inv1');
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(result.current.actionLoading).toBe(false);
    });

    it('should alert when cancelling the invitation fails', async () => {
      const { result, onSuccess } = setup();
      mockApi.cancelInvitation.mockRejectedValue(new Error('boom'));
      act(() => result.current.handleCancelInvitation(makeMember({ invitationId: 'inv1' })));

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'tripMembers.cancelInviteError');
    });

    it('should stay silent about the cancellation failure outside development', async () => {
      const originalDev = (global as { __DEV__: boolean }).__DEV__;
      (global as { __DEV__: boolean }).__DEV__ = false;
      const { result } = setup();
      mockApi.cancelInvitation.mockRejectedValue(new Error('boom'));
      act(() => result.current.handleCancelInvitation(makeMember({ invitationId: 'inv1' })));

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(warnSpy).not.toHaveBeenCalled();
      (global as { __DEV__: boolean }).__DEV__ = originalDev;
    });
  });

  describe('handleRemoveMember', () => {
    it('should do nothing when no member is selected', () => {
      const { result } = setup();
      const closeSheet = jest.fn();

      act(() => result.current.handleRemoveMember(null, closeSheet));

      expect(closeSheet).not.toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should remove the collaborator and refresh when confirmed', async () => {
      const { result, onSuccess } = setup();
      const closeSheet = jest.fn();
      mockApi.removeTripCollaborator.mockResolvedValue(true);
      act(() => result.current.handleRemoveMember(makeMember(), closeSheet));

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(closeSheet).toHaveBeenCalledTimes(1);
      expect(mockApi.removeTripCollaborator).toHaveBeenCalledWith('trip1', 'user1');
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('should alert when removing the collaborator fails', async () => {
      const { result } = setup();
      mockApi.removeTripCollaborator.mockRejectedValue(new Error('boom'));
      act(() => result.current.handleRemoveMember(makeMember(), jest.fn()));

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'tripMembers.removeError');
    });

    it('should stay silent about the removal failure outside development', async () => {
      const originalDev = (global as { __DEV__: boolean }).__DEV__;
      (global as { __DEV__: boolean }).__DEV__ = false;
      const { result } = setup();
      mockApi.removeTripCollaborator.mockRejectedValue(new Error('boom'));
      act(() => result.current.handleRemoveMember(makeMember(), jest.fn()));

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(warnSpy).not.toHaveBeenCalled();
      (global as { __DEV__: boolean }).__DEV__ = originalDev;
    });
  });

  describe('handleTransferOwnership', () => {
    it('should do nothing when no member is selected', () => {
      const { result } = setup();
      const closeSheet = jest.fn();

      act(() => result.current.handleTransferOwnership(null, closeSheet));

      expect(closeSheet).not.toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should transfer ownership and refresh when confirmed', async () => {
      const { result, onSuccess } = setup();
      const closeSheet = jest.fn();
      mockApi.transferTripOwnership.mockResolvedValue(true);
      act(() => result.current.handleTransferOwnership(makeMember(), closeSheet));

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(closeSheet).toHaveBeenCalledTimes(1);
      expect(mockApi.transferTripOwnership).toHaveBeenCalledWith('trip1', 'user1');
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('should alert when the ownership transfer fails', async () => {
      const { result } = setup();
      mockApi.transferTripOwnership.mockRejectedValue(new Error('boom'));
      act(() => result.current.handleTransferOwnership(makeMember(), jest.fn()));

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'tripMembers.transferError');
    });

    it('should stay silent about the transfer failure outside development', async () => {
      const originalDev = (global as { __DEV__: boolean }).__DEV__;
      (global as { __DEV__: boolean }).__DEV__ = false;
      const { result } = setup();
      mockApi.transferTripOwnership.mockRejectedValue(new Error('boom'));
      act(() => result.current.handleTransferOwnership(makeMember(), jest.fn()));

      await act(async () => {
        await lastAlertConfirmButton().onPress();
      });

      expect(warnSpy).not.toHaveBeenCalled();
      (global as { __DEV__: boolean }).__DEV__ = originalDev;
    });
  });

  describe('handleViewProfile', () => {
    it('should do nothing when no member is selected', () => {
      const { result } = setup();

      act(() => result.current.handleViewProfile(null, jest.fn()));

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should close the sheet and navigate to the member profile', () => {
      const { result } = setup();
      const closeSheet = jest.fn();

      act(() => result.current.handleViewProfile(makeMember(), closeSheet));

      expect(closeSheet).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('FriendProfile', {
        friendId: 'user1',
        friendName: 'Alice',
      });
    });
  });
});
