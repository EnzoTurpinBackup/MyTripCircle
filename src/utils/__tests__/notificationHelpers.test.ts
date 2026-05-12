jest.mock('../i18n', () => ({
  __esModule: true,
  default: {
    t: (key: string, opts?: any) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
    language: 'fr',
  },
}));

import { iconForStatus, subtitleForInvitation, titleForInvitation, timeAgo } from '../notificationHelpers';

describe('iconForStatus', () => {
  it('should return checkmark emoji for accepted status', () => {
    const result = iconForStatus('accepted');
    expect(result.emoji).toBe('✅');
    expect(result.bg).toBe('#E2EDD9');
  });

  it('should return cross emoji for declined status', () => {
    const result = iconForStatus('declined');
    expect(result.emoji).toBe('❌');
    expect(result.bg).toBe('#FDEAEA');
  });

  it('should return plane emoji for any other status', () => {
    const result = iconForStatus('pending');
    expect(result.emoji).toBe('✈️');
    expect(result.bg).toBe('#F5E5DC');
  });
});

describe('subtitleForInvitation', () => {
  it('should combine trip name and date when trip name is available', () => {
    const inv = { tripName: 'Tokyo Trip' };
    expect(subtitleForInvitation(inv, '15 juin')).toBe('Tokyo Trip · 15 juin');
  });

  it('should fall back to trip.title when tripName is absent', () => {
    const inv = { trip: { title: 'Bali Trip' } };
    expect(subtitleForInvitation(inv, '15 juin')).toBe('Bali Trip · 15 juin');
  });

  it('should return only the date when no trip name is available', () => {
    expect(subtitleForInvitation({}, '15 juin')).toBe('15 juin');
  });
});

describe('titleForInvitation', () => {
  it('should return accepted key when status is accepted', () => {
    const inv = { status: 'accepted', inviterName: 'Alice' };
    const result = titleForInvitation(inv);
    expect(result).toContain('notifications.inviteAccepted');
  });

  it('should return declined key when status is declined', () => {
    const inv = { status: 'declined', inviterName: 'Bob' };
    const result = titleForInvitation(inv);
    expect(result).toContain('notifications.inviteDeclined');
  });

  it('should return received key for pending status', () => {
    const inv = { status: 'pending', inviterName: 'Charlie' };
    const result = titleForInvitation(inv);
    expect(result).toContain('notifications.inviteReceived');
  });

  it('should use inviter.name when inviterName is absent', () => {
    const inv = { status: 'pending', inviter: { name: 'Dave' } };
    const result = titleForInvitation(inv);
    expect(result).toContain('Dave');
  });

  it('should use i18n fallback key when no inviter name is available', () => {
    const inv = { status: 'pending' };
    const result = titleForInvitation(inv);
    expect(result).toContain('invitation.someoneRef');
  });
});

describe('timeAgo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return justNow key for less than 1 minute ago', () => {
    const recent = new Date('2024-06-15T11:59:30Z').toISOString();
    expect(timeAgo(recent)).toBe('notifications.timeAgo.justNow');
  });

  it('should return minutes key for less than 60 minutes ago', () => {
    const thirtyMinAgo = new Date('2024-06-15T11:30:00Z').toISOString();
    expect(timeAgo(thirtyMinAgo)).toContain('notifications.timeAgo.minutes');
  });

  it('should return hours key for less than 24 hours ago', () => {
    const threeHoursAgo = new Date('2024-06-15T09:00:00Z').toISOString();
    expect(timeAgo(threeHoursAgo)).toContain('notifications.timeAgo.hours');
  });

  it('should return yesterday key for exactly 1 day ago', () => {
    const oneDayAgo = new Date('2024-06-14T12:00:00Z').toISOString();
    expect(timeAgo(oneDayAgo)).toBe('notifications.timeAgo.yesterday');
  });

  it('should return days key for more than 1 day ago', () => {
    const threeDaysAgo = new Date('2024-06-12T12:00:00Z').toISOString();
    expect(timeAgo(threeDaysAgo)).toContain('notifications.timeAgo.days');
  });
});
