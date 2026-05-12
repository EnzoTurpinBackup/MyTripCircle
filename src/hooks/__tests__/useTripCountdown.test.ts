import { renderHook, act } from '@testing-library/react-native';
import { useTripCountdown } from '../useTripCountdown';
import type { Trip } from '../../types';

const makeTrip = (startDate: Date, endDate: Date): Trip => ({
  id: 'trip1',
  title: 'Test Trip',
  destination: 'Tokyo',
  ownerId: 'owner1',
  collaborators: [],
  isPublic: false,
  visibility: 'private',
  status: 'draft',
  stats: { totalBookings: 0, totalAddresses: 0, totalCollaborators: 0 },
  location: { type: 'Point', coordinates: [0, 0] },
  startDate,
  endDate,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('useTripCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return null countdown when trip is null', () => {
    const { result } = renderHook(() => useTripCountdown(null));
    expect(result.current.countdown).toBeNull();
  });

  it('should return 0 progressPercent and 0 durationDays when trip is null', () => {
    const { result } = renderHook(() => useTripCountdown(null));
    expect(result.current.progressPercent).toBe(0);
    expect(result.current.durationDays).toBe(0);
  });

  it('should return null countdown when the trip has already started', () => {
    jest.setSystemTime(new Date('2024-06-10T12:00:00Z'));
    const trip = makeTrip(new Date('2024-06-01'), new Date('2024-06-15'));
    const { result } = renderHook(() => useTripCountdown(trip));
    expect(result.current.countdown).toBeNull();
  });

  it('should return countdown values for a future trip', () => {
    jest.setSystemTime(new Date('2024-06-01T12:00:00Z'));
    const trip = makeTrip(new Date('2024-06-10T12:00:00Z'), new Date('2024-06-20T12:00:00Z'));
    const { result } = renderHook(() => useTripCountdown(trip));
    expect(result.current.countdown).not.toBeNull();
    expect(result.current.countdown?.days).toBe(9);
  });

  it('should compute durationDays correctly', () => {
    jest.setSystemTime(new Date('2024-05-01T00:00:00Z'));
    const trip = makeTrip(new Date('2024-06-01'), new Date('2024-06-15'));
    const { result } = renderHook(() => useTripCountdown(trip));
    expect(result.current.durationDays).toBe(14);
  });

  it('should return progressPercent 0 when the trip has not started', () => {
    jest.setSystemTime(new Date('2024-05-01T00:00:00Z'));
    const trip = makeTrip(new Date('2024-06-01'), new Date('2024-06-15'));
    const { result } = renderHook(() => useTripCountdown(trip));
    expect(result.current.progressPercent).toBe(0);
  });

  it('should return progressPercent 100 when the trip has ended', () => {
    jest.setSystemTime(new Date('2024-07-01T00:00:00Z'));
    const trip = makeTrip(new Date('2024-06-01'), new Date('2024-06-15'));
    const { result } = renderHook(() => useTripCountdown(trip));
    expect(result.current.progressPercent).toBe(100);
  });

  it('should return an intermediate progressPercent during the trip', () => {
    // Trip from June 1 to June 11 (10 days) — at day 5 (June 6) → ~50%
    jest.setSystemTime(new Date('2024-06-06T00:00:00Z'));
    const trip = makeTrip(new Date('2024-06-01T00:00:00Z'), new Date('2024-06-11T00:00:00Z'));
    const { result } = renderHook(() => useTripCountdown(trip));
    expect(result.current.progressPercent).toBeGreaterThan(0);
    expect(result.current.progressPercent).toBeLessThan(100);
  });

  it('should decrement the countdown seconds after each interval tick', () => {
    jest.setSystemTime(new Date('2024-06-01T12:00:00Z'));
    const trip = makeTrip(new Date('2024-06-10T12:00:00Z'), new Date('2024-06-20T12:00:00Z'));
    const { result } = renderHook(() => useTripCountdown(trip));
    const initialSeconds = result.current.countdown?.seconds;

    act(() => { jest.advanceTimersByTime(2000); });

    expect(result.current.countdown?.seconds).not.toBe(initialSeconds);
  });

  it('should clear the interval when the hook unmounts', () => {
    jest.setSystemTime(new Date('2024-06-01T12:00:00Z'));
    const trip = makeTrip(new Date('2024-06-10T12:00:00Z'), new Date('2024-06-20T12:00:00Z'));
    const clearSpy = jest.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useTripCountdown(trip));

    act(() => {
      jest.advanceTimersByTime(0);
    });
    act(() => {
      unmount();
    });

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('should null the countdown and stop the interval once the trip start is reached', () => {
    jest.setSystemTime(new Date('2024-06-10T11:59:58Z'));
    const trip = makeTrip(new Date('2024-06-10T12:00:00Z'), new Date('2024-06-20T12:00:00Z'));
    const { result } = renderHook(() => useTripCountdown(trip));
    expect(result.current.countdown).not.toBeNull();

    act(() => {
      jest.setSystemTime(new Date('2024-06-10T12:00:02Z'));
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.countdown).toBeNull();
  });

  it('should not call clearInterval on unmount when the interval was already cleared at trip start', () => {
    jest.setSystemTime(new Date('2024-06-10T11:59:58Z'));
    const trip = makeTrip(new Date('2024-06-10T12:00:00Z'), new Date('2024-06-20T12:00:00Z'));
    const clearSpy = jest.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useTripCountdown(trip));

    act(() => {
      jest.setSystemTime(new Date('2024-06-10T12:00:02Z'));
      jest.advanceTimersByTime(5000);
    });

    clearSpy.mockClear();

    act(() => {
      unmount();
    });

    expect(clearSpy).not.toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
