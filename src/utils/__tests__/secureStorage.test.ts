jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import { setItem, getItem, removeItem, multiRemove } from '../secureStorage';

const mockSetItemAsync = SecureStore.setItemAsync as jest.Mock;
const mockGetItemAsync = SecureStore.getItemAsync as jest.Mock;
const mockDeleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockSetItemAsync.mockResolvedValue(undefined);
  mockGetItemAsync.mockResolvedValue(null);
  mockDeleteItemAsync.mockResolvedValue(undefined);
});

describe('setItem', () => {
  it.each(['token', 'refreshToken', 'user'])(
    'should delegate to SecureStore when the key "%s" is allowed',
    async (key) => {
      // Arrange / Act
      await setItem(key, 'valeur');

      // Assert
      expect(mockSetItemAsync).toHaveBeenCalledWith(key, 'valeur');
    }
  );

  it('should throw when the key is not allowed', async () => {
    // Arrange / Act / Assert
    await expect(setItem('sessionSecret', 'valeur')).rejects.toThrow(
      'secureStorage: clé non autorisée "sessionSecret"'
    );
    expect(mockSetItemAsync).not.toHaveBeenCalled();
  });
});

describe('getItem', () => {
  it('should return the stored value when the key is allowed', async () => {
    // Arrange
    mockGetItemAsync.mockResolvedValue('jwt-abc');

    // Act
    const result = await getItem('token');

    // Assert
    expect(result).toBe('jwt-abc');
    expect(mockGetItemAsync).toHaveBeenCalledWith('token');
  });

  it('should return null without hitting SecureStore when the key is not allowed', async () => {
    // Arrange / Act
    const result = await getItem('language');

    // Assert
    expect(result).toBeNull();
    expect(mockGetItemAsync).not.toHaveBeenCalled();
  });
});

describe('removeItem', () => {
  it('should delete the entry when the key is allowed', async () => {
    // Arrange / Act
    await removeItem('refreshToken');

    // Assert
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('refreshToken');
  });

  it('should do nothing when the key is not allowed', async () => {
    // Arrange / Act
    await removeItem('theme');

    // Assert
    expect(mockDeleteItemAsync).not.toHaveBeenCalled();
  });
});

describe('multiRemove', () => {
  it('should delete every allowed key and skip the others', async () => {
    // Arrange
    const keys = ['token', 'theme', 'user'];

    // Act
    await multiRemove(keys);

    // Assert
    expect(mockDeleteItemAsync).toHaveBeenCalledTimes(2);
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('token');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('user');
  });

  it('should resolve without any deletion when the key list is empty', async () => {
    // Arrange / Act
    await multiRemove([]);

    // Assert
    expect(mockDeleteItemAsync).not.toHaveBeenCalled();
  });
});
