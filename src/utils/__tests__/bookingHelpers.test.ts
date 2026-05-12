import {
  getBookingTypeIcon,
  getBookingTypeColors,
  getBookingStatusColors,
  getBookingTypeColorsDetail,
  getBookingStatusColorsDetail,
  getBookingHeroGradient,
} from '../bookingHelpers';

describe('getBookingTypeIcon', () => {
  it('should return the correct icon for each booking type', () => {
    expect(getBookingTypeIcon('flight')).toBe('airplane');
    expect(getBookingTypeIcon('train')).toBe('train');
    expect(getBookingTypeIcon('hotel')).toBe('bed');
    expect(getBookingTypeIcon('restaurant')).toBe('restaurant');
    expect(getBookingTypeIcon('activity')).toBe('ticket');
  });

  it('should return receipt as the default icon', () => {
    expect(getBookingTypeIcon('unknown' as any)).toBe('receipt');
  });
});

describe('getBookingTypeColors', () => {
  it('should return colors for known types', () => {
    expect(getBookingTypeColors('flight')).toEqual({ stripe: '#5A8FAA', bg: '#DCF0F5' });
    expect(getBookingTypeColors('hotel')).toEqual({ stripe: '#6B8C5A', bg: '#E2EDD9' });
    expect(getBookingTypeColors('train')).toEqual({ stripe: '#C4714A', bg: '#F5E5DC' });
    expect(getBookingTypeColors('restaurant')).toEqual({ stripe: '#C4714A', bg: '#F5E5DC' });
    expect(getBookingTypeColors('activity')).toEqual({ stripe: '#8B70C0', bg: '#EDE8F5' });
  });

  it('should return null for unknown type', () => {
    expect(getBookingTypeColors('unknown' as any)).toBeNull();
  });
});

describe('getBookingStatusColors', () => {
  it('should return colors for each status', () => {
    expect(getBookingStatusColors('confirmed')).toEqual({ color: '#6B8C5A', bg: '#E2EDD9' });
    expect(getBookingStatusColors('pending')).toEqual({ color: '#C4714A', bg: '#F5E5DC' });
    expect(getBookingStatusColors('cancelled')).toEqual({ color: '#C04040', bg: '#FDEAEA' });
  });

  it('should return null for unknown status', () => {
    expect(getBookingStatusColors('unknown' as any)).toBeNull();
  });
});

describe('getBookingTypeColorsDetail', () => {
  it('should return rgba bg colors for known types', () => {
    const flight = getBookingTypeColorsDetail('flight');
    expect(flight.stripe).toBe('#5A8FAA');
    expect(flight.bg).toMatch(/^rgba\(/);

    const hotel = getBookingTypeColorsDetail('hotel');
    expect(hotel.stripe).toBe('#6B8C5A');

    const train = getBookingTypeColorsDetail('train');
    expect(train.stripe).toBe('#C8A870');

    const restaurant = getBookingTypeColorsDetail('restaurant');
    expect(restaurant.stripe).toBe('#D08070');

    const activity = getBookingTypeColorsDetail('activity');
    expect(activity.stripe).toBe('#A080D0');
  });

  it('should return default colors for unknown type', () => {
    const result = getBookingTypeColorsDetail('unknown' as any);
    expect(result.stripe).toBe('#B0A090');
    expect(result.bg).toMatch(/^rgba\(/);
  });
});

describe('getBookingStatusColorsDetail', () => {
  it('should return rgba bg colors for each status', () => {
    expect(getBookingStatusColorsDetail('confirmed').color).toBe('#7BC88A');
    expect(getBookingStatusColorsDetail('pending').color).toBe('#E8B870');
    expect(getBookingStatusColorsDetail('cancelled').color).toBe('#E08080');
  });

  it('should return default colors for unknown status', () => {
    const result = getBookingStatusColorsDetail('unknown' as any);
    expect(result.color).toBe('#B0A090');
  });
});

describe('getBookingHeroGradient', () => {
  it('should return a tuple of 3 hex strings for each type', () => {
    const types = ['flight', 'hotel', 'train', 'restaurant', 'activity'] as const;
    for (const type of types) {
      const gradient = getBookingHeroGradient(type);
      expect(gradient).toHaveLength(3);
      gradient.forEach((color) => expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/));
    }
  });

  it('should return default gradient for unknown type', () => {
    const result = getBookingHeroGradient('unknown' as any);
    expect(result).toHaveLength(3);
  });
});
