import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useSearchHistory from '../useSearchHistory';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

describe('useSearchHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);
  });

  it('should initialize with an empty history', async () => {
    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.history).toEqual([]);
  });

  it('should load existing history from AsyncStorage on mount', async () => {
    const stored = JSON.stringify(['tokyo', 'paris']);
    mockGetItem.mockResolvedValue(stored);
    const { result } = renderHook(() => useSearchHistory());
    await act(async () => {});
    expect(result.current.history).toEqual(['tokyo', 'paris']);
  });

  it('should add a new entry to the front of history', async () => {
    const { result } = renderHook(() => useSearchHistory());
    await act(async () => {
      await result.current.saveToHistory('bali');
    });
    expect(result.current.history[0]).toBe('bali');
    expect(mockSetItem).toHaveBeenCalledWith(
      'add_friend_search_history',
      JSON.stringify(['bali'])
    );
  });

  it('should deduplicate entries when saving', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(['bali', 'tokyo']));
    const { result } = renderHook(() => useSearchHistory());
    await act(async () => {});
    await act(async () => {
      await result.current.saveToHistory('tokyo');
    });
    expect(result.current.history).toEqual(['tokyo', 'bali']);
  });

  it('should cap history at 6 entries', async () => {
    const existing = ['a', 'b', 'c', 'd', 'e', 'f'];
    mockGetItem.mockResolvedValue(JSON.stringify(existing));
    const { result } = renderHook(() => useSearchHistory());
    await act(async () => {});
    await act(async () => {
      await result.current.saveToHistory('g');
    });
    expect(result.current.history).toHaveLength(6);
    expect(result.current.history[0]).toBe('g');
  });

  it('should not save an empty or whitespace-only query', async () => {
    const { result } = renderHook(() => useSearchHistory());
    await act(async () => {
      await result.current.saveToHistory('   ');
    });
    expect(result.current.history).toEqual([]);
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('should remove a specific entry from history', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(['bali', 'tokyo', 'paris']));
    const { result } = renderHook(() => useSearchHistory());
    await act(async () => {});
    await act(async () => {
      await result.current.removeFromHistory('tokyo');
    });
    expect(result.current.history).toEqual(['bali', 'paris']);
  });

  it('should clear all history', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(['bali', 'tokyo']));
    const { result } = renderHook(() => useSearchHistory());
    await act(async () => {});
    await act(async () => {
      await result.current.clearHistory();
    });
    expect(result.current.history).toEqual([]);
    expect(mockRemoveItem).toHaveBeenCalledWith('add_friend_search_history');
  });
});
