import { renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useConfirmAction } from '../useConfirmAction';

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('useConfirmAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should expose a confirm function', () => {
    const { result } = renderHook(() => useConfirmAction());
    expect(typeof result.current.confirm).toBe('function');
  });

  it('should call Alert.alert with the correct title and message', () => {
    const { result } = renderHook(() => useConfirmAction());
    result.current.confirm({
      title: 'Supprimer le voyage',
      message: 'Cette action est irréversible.',
      confirmText: 'Supprimer',
      onConfirm: jest.fn(),
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Supprimer le voyage',
      'Cette action est irréversible.',
      expect.any(Array)
    );
  });

  it('should include a cancel button and a confirm button', () => {
    const { result } = renderHook(() => useConfirmAction());
    result.current.confirm({
      title: 'Test',
      message: 'Test',
      confirmText: 'Confirmer',
      onConfirm: jest.fn(),
    });
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    expect(buttons).toHaveLength(2);
    expect(buttons[0].style).toBe('cancel');
    expect(buttons[1].text).toBe('Confirmer');
  });

  it('should use "Annuler" as default cancel text', () => {
    const { result } = renderHook(() => useConfirmAction());
    result.current.confirm({
      title: 'Test',
      message: 'Test',
      confirmText: 'OK',
      onConfirm: jest.fn(),
    });
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    expect(buttons[0].text).toBe('Annuler');
  });

  it('should use custom cancelText when provided', () => {
    const { result } = renderHook(() => useConfirmAction());
    result.current.confirm({
      title: 'Test',
      message: 'Test',
      cancelText: 'Non',
      confirmText: 'Oui',
      onConfirm: jest.fn(),
    });
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    expect(buttons[0].text).toBe('Non');
  });

  it('should use destructive confirm style by default', () => {
    const { result } = renderHook(() => useConfirmAction());
    result.current.confirm({
      title: 'Test',
      message: 'Test',
      confirmText: 'Supprimer',
      onConfirm: jest.fn(),
    });
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    expect(buttons[1].style).toBe('destructive');
  });

  it('should call onConfirm when the confirm button is pressed', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useConfirmAction());
    result.current.confirm({
      title: 'Test',
      message: 'Test',
      confirmText: 'OK',
      onConfirm,
    });
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    await buttons[1].onPress();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
