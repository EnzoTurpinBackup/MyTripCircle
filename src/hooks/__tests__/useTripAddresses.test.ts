import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import useTripAddresses from '../useTripAddresses';
import { parseApiError } from '../../utils/i18n';
import type { Address } from '../../types';

jest.mock('../../utils/i18n', () => ({
  parseApiError: jest.fn(),
}));

const mockParseApiError = parseApiError as jest.Mock;

const makeAddress = (overrides: Partial<Address> = {}): Address => ({
  id: 'addr1',
  type: 'hotel',
  name: 'Hôtel Central',
  address: '1 rue de la Paix',
  city: 'Paris',
  country: 'France',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

type AddressPayload = Omit<Address, 'id' | 'createdAt' | 'updatedAt'>;

const makeAddressPayload = (overrides: Partial<AddressPayload> = {}): AddressPayload => {
  const { id, createdAt, updatedAt, ...payload } = makeAddress();
  return { ...payload, ...overrides };
};

const t = (key: string) => key;

const setup = () => {
  const createAddress = jest.fn();
  const updateAddress = jest.fn();
  const deleteAddress = jest.fn();
  const { result } = renderHook(() =>
    useTripAddresses({ tripId: 'trip1', createAddress, updateAddress, deleteAddress, t })
  );
  return { result, createAddress, updateAddress, deleteAddress };
};

/** Récupère le bouton de confirmation de la dernière Alert affichée. */
const lastAlertConfirmButton = () => {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  return calls[calls.length - 1][2][1];
};

describe('useTripAddresses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockParseApiError.mockReturnValue('erreur api');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should start with an empty address list and a closed form', () => {
    const { result } = setup();

    expect(result.current.addresses).toEqual([]);
    expect(result.current.showAddressForm).toBe(false);
    expect(result.current.editingAddress).toBeUndefined();
  });

  it('should open the form without an editing address when adding', () => {
    const { result } = setup();
    act(() => result.current.setAddresses([makeAddress()]));

    act(() => result.current.handleAddAddress());

    expect(result.current.showAddressForm).toBe(true);
    expect(result.current.editingAddress).toBeUndefined();
  });

  it('should open the form on the selected address when editing', () => {
    const { result } = setup();
    const second = makeAddress({ id: 'addr2', name: 'Chez Léon' });
    act(() => result.current.setAddresses([makeAddress(), second]));

    act(() => result.current.handleEditAddress(1));

    expect(result.current.showAddressForm).toBe(true);
    expect(result.current.editingAddress).toEqual(second);
  });

  it('should ask for confirmation before deleting an address', () => {
    const { result } = setup();
    act(() => result.current.setAddresses([makeAddress()]));

    act(() => result.current.handleDeleteAddress(0));

    expect(Alert.alert).toHaveBeenCalledWith('common.confirm', 'addresses.details.deleteConfirm', [
      { text: 'common.cancel', style: 'cancel' },
      expect.objectContaining({ text: 'common.ok', style: 'destructive' }),
    ]);
  });

  it('should delete the address remotely and locally when deletion is confirmed', async () => {
    const { result, deleteAddress } = setup();
    deleteAddress.mockResolvedValue(true);
    act(() => result.current.setAddresses([makeAddress(), makeAddress({ id: 'addr2' })]));
    act(() => result.current.handleDeleteAddress(0));

    await act(async () => {
      await lastAlertConfirmButton().onPress();
    });

    expect(deleteAddress).toHaveBeenCalledWith('addr1');
    expect(result.current.addresses.map((a) => a.id)).toEqual(['addr2']);
  });

  it('should only remove the address locally when it has no id', async () => {
    const { result, deleteAddress } = setup();
    act(() => result.current.setAddresses([makeAddress({ id: '' })]));
    act(() => result.current.handleDeleteAddress(0));

    await act(async () => {
      await lastAlertConfirmButton().onPress();
    });

    expect(deleteAddress).not.toHaveBeenCalled();
    expect(result.current.addresses).toEqual([]);
  });

  it('should create the address and append it when no address is being edited', async () => {
    const { result, createAddress } = setup();
    const created = makeAddress({ id: 'created' });
    createAddress.mockResolvedValue(created);
    act(() => result.current.handleAddAddress());

    await act(async () => {
      await result.current.handleSaveAddress(makeAddressPayload({ name: 'Nouveau' }));
    });

    expect(createAddress).toHaveBeenCalledWith(expect.objectContaining({ name: 'Nouveau', tripId: 'trip1' }));
    expect(result.current.addresses).toEqual([created]);
    expect(result.current.showAddressForm).toBe(false);
  });

  it('should update the edited address in place when it has an id', async () => {
    const { result, updateAddress } = setup();
    updateAddress.mockResolvedValue(makeAddress());
    act(() => result.current.setAddresses([makeAddress(), makeAddress({ id: 'addr2', name: 'Ancien' })]));
    act(() => result.current.handleEditAddress(1));

    await act(async () => {
      await result.current.handleSaveAddress(makeAddressPayload({ name: 'Renommé' }));
    });

    expect(updateAddress).toHaveBeenCalledWith('addr2', expect.objectContaining({ name: 'Renommé' }));
    expect(result.current.addresses[1].name).toBe('Renommé');
    expect(result.current.addresses[1].id).toBe('addr2');
    expect(result.current.addresses[0].name).toBe('Hôtel Central');
  });

  it('should skip the remote update when the edited address has no id', async () => {
    const { result, updateAddress } = setup();
    act(() => result.current.setAddresses([makeAddress({ id: '', name: 'Brouillon' })]));
    act(() => result.current.handleEditAddress(0));

    await act(async () => {
      await result.current.handleSaveAddress(makeAddressPayload({ name: 'Renommé' }));
    });

    expect(updateAddress).not.toHaveBeenCalled();
    expect(result.current.addresses[0].name).toBe('Brouillon');
    expect(result.current.showAddressForm).toBe(false);
  });

  it('should alert with the parsed api error when saving fails', async () => {
    const { result, createAddress } = setup();
    createAddress.mockRejectedValue(new Error('boom'));
    mockParseApiError.mockReturnValue('adresse invalide');

    await act(async () => {
      await result.current.handleSaveAddress(makeAddressPayload());
    });

    expect(Alert.alert).toHaveBeenCalledWith('common.error', 'adresse invalide');
  });

  it('should alert with the generic message when the api error cannot be parsed', async () => {
    const { result, createAddress } = setup();
    createAddress.mockRejectedValue(new Error('boom'));
    mockParseApiError.mockReturnValue('');

    await act(async () => {
      await result.current.handleSaveAddress(makeAddressPayload());
    });

    expect(Alert.alert).toHaveBeenCalledWith('common.error', 'addresses.form.submitError');
  });

  it('should close the form and clear the edited address', () => {
    const { result } = setup();
    act(() => result.current.setAddresses([makeAddress()]));
    act(() => result.current.handleEditAddress(0));

    act(() => result.current.closeAddressForm());

    expect(result.current.showAddressForm).toBe(false);
    expect(result.current.editingAddress).toBeUndefined();
  });
});
