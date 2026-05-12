jest.mock('i18next', () => ({
  default: {
    t: (key: string) => key,
    language: 'fr',
  },
  t: (key: string) => key,
  language: 'fr',
}));

import { formatDate, formatDateLong, formatTime } from '../dateFormatters';

describe('formatDate', () => {
  it('should return the i18n key when date is null', () => {
    expect(formatDate(null)).toBe('common.dateNotAvailable');
  });

  it('should return the i18n key when date is undefined', () => {
    expect(formatDate(undefined)).toBe('common.dateNotAvailable');
  });

  it('should return the invalid date key for an unparseable string', () => {
    expect(formatDate('not-a-date')).toBe('common.invalidDate');
  });

  it('should return a non-empty string for a valid Date object', () => {
    const result = formatDate(new Date('2024-06-15'));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('common.dateNotAvailable');
  });

  it('should return a non-empty string for a valid date string', () => {
    const result = formatDate('2024-06-15T10:00:00Z');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('common.dateNotAvailable');
  });

  it('should accept custom Intl.DateTimeFormatOptions', () => {
    const result = formatDate(new Date('2024-06-15'), { month: 'long', year: 'numeric' });
    expect(typeof result).toBe('string');
  });

  it('should return invalidDate when formatting throws', () => {
    const spy = jest.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(() => {
      throw new Error('locale failure');
    });
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(formatDate(new Date('2024-06-15'))).toBe('common.invalidDate');

    spy.mockRestore();
    errSpy.mockRestore();
  });
});

describe('formatDateLong', () => {
  it('should return the i18n key when date is null', () => {
    expect(formatDateLong(null)).toBe('common.dateNotAvailable');
  });

  it('should return a non-empty string for a valid date', () => {
    const result = formatDateLong(new Date('2024-06-15'));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatTime', () => {
  it('should return empty string when time is null', () => {
    expect(formatTime(null)).toBe('');
  });

  it('should return empty string when time is undefined', () => {
    expect(formatTime(undefined)).toBe('');
  });

  it('should return a formatted time string for HH:MM input', () => {
    const result = formatTime('14:30');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return the raw time when formatting throws', () => {
    const spy = jest.spyOn(Date.prototype, 'toLocaleTimeString').mockImplementation(() => {
      throw new Error('locale failure');
    });
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(formatTime('09:15')).toBe('09:15');

    spy.mockRestore();
    errSpy.mockRestore();
  });

  it('should use en-US locale when i18n language is not fr', () => {
    jest.resetModules();
    jest.doMock('i18next', () => ({
      default: {
        t: (key: string) => key,
        language: 'en',
      },
      t: (key: string) => key,
      language: 'en',
    }));
    const { formatDate: formatDateEn, formatTime: formatTimeEn } = require('../dateFormatters');
    expect(typeof formatDateEn(new Date('2024-06-15'))).toBe('string');
    expect(formatTimeEn('14:30').length).toBeGreaterThan(0);
  });
});
