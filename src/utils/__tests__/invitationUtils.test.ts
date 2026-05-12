jest.mock('../i18n', () => ({
  __esModule: true,
  default: {
    t: (key: string, opts?: any) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
    language: 'fr',
  },
}));

import { getBannerGradient, tripDuration, formatRelative, formatDateRange } from '../invitationUtils';

describe('getBannerGradient', () => {
  it('should still hash when codePointAt returns undefined for an index', () => {
    const orig = String.prototype.codePointAt;
    const spy = jest.spyOn(String.prototype, 'codePointAt').mockImplementation(function (this: string, pos: number) {
      if (pos === 1) return undefined as unknown as number;
      return orig.call(this, pos);
    });
    const gradient = getBannerGradient('ab');
    expect(gradient).toHaveLength(2);
    spy.mockRestore();
  });

  it('should return a tuple of 2 hex strings', () => {
    const gradient = getBannerGradient('some-seed');
    expect(gradient).toHaveLength(2);
    gradient.forEach((color) => expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/));
  });

  it('should return a consistent gradient for the same seed', () => {
    expect(getBannerGradient('trip-abc')).toEqual(getBannerGradient('trip-abc'));
  });

  it('should return different gradients for different seeds', () => {
    const results = new Set(
      ['seed1', 'seed2', 'seed3', 'seed4', 'seed5'].map((s) => JSON.stringify(getBannerGradient(s)))
    );
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('tripDuration', () => {
  it('should return the number of days between start and end', () => {
    expect(tripDuration('2024-06-01T00:00:00Z', '2024-06-15T00:00:00Z')).toBe(14);
  });

  it('should return 1 as minimum duration', () => {
    expect(tripDuration('2024-06-01T00:00:00Z', '2024-06-01T12:00:00Z')).toBe(1);
  });

  it('should work with Date objects', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-08');
    expect(tripDuration(start, end)).toBe(7);
  });
});

describe('formatRelative', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return "just now" for a date less than 1 minute ago', () => {
    const recent = new Date('2024-06-15T11:59:30Z').toISOString();
    expect(formatRelative(recent)).toBe('invitation.timeAgoJustNow');
  });

  it('should return hours key for a date less than 24 hours ago', () => {
    const twoHoursAgo = new Date('2024-06-15T10:00:00Z').toISOString();
    const result = formatRelative(twoHoursAgo);
    expect(result).toContain('invitation.timeAgoHours');
  });

  it('should return days key for a date less than 7 days ago', () => {
    const threeDaysAgo = new Date('2024-06-12T12:00:00Z').toISOString();
    const result = formatRelative(threeDaysAgo);
    expect(result).toContain('invitation.timeAgoDays');
  });

  it('should return weeks key for a date less than 30 days ago', () => {
    const tenDaysAgo = new Date('2024-06-05T12:00:00Z').toISOString();
    const result = formatRelative(tenDaysAgo);
    expect(result).toContain('invitation.timeAgoWeeks');
  });

  it('should return months key for a date more than 30 days ago', () => {
    const twoMonthsAgo = new Date('2024-04-10T12:00:00Z').toISOString();
    const result = formatRelative(twoMonthsAgo);
    expect(result).toContain('invitation.timeAgoMonths');
  });
});

describe('formatDateRange', () => {
  it('should return a string combining start and end dates', () => {
    const result = formatDateRange('2024-06-01', '2024-06-15');
    expect(typeof result).toBe('string');
    expect(result).toContain('–');
  });

  it('should work with Date objects', () => {
    const result = formatDateRange(new Date('2024-06-01'), new Date('2024-06-15'));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should use en-US when i18n language is not fr', () => {
    jest.resetModules();
    jest.doMock('../i18n', () => ({
      __esModule: true,
      default: {
        t: (key: string, opts?: unknown) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
        language: 'en',
      },
    }));
    const { formatDateRange: formatRangeEn } = require('../invitationUtils');
    const result = formatRangeEn('2024-06-01', '2024-06-15');
    expect(typeof result).toBe('string');
    expect(result).toContain('–');
  });
});
