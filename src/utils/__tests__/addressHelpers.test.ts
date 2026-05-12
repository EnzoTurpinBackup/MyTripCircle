import { getAddressHeroGradient, getAddressTypeBadge } from '../addressHelpers';

const t = (key: string) => key;

describe('getAddressHeroGradient', () => {
  it('should return a tuple of 3 hex strings for each address type', () => {
    const types = ['restaurant', 'hotel', 'activity', 'transport', 'other'] as const;
    for (const type of types) {
      const gradient = getAddressHeroGradient(type);
      expect(gradient).toHaveLength(3);
      gradient.forEach((color) => expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/));
    }
  });

  it('should return a default gradient for unknown type', () => {
    const result = getAddressHeroGradient('unknown' as any);
    expect(result).toHaveLength(3);
  });
});

describe('getAddressTypeBadge', () => {
  it('should return label and emoji for restaurant', () => {
    const result = getAddressTypeBadge('restaurant', t);
    expect(result.emoji).toBe('🍽');
    expect(result.label).toBe('addresses.filters.restaurant');
  });

  it('should return label and emoji for hotel', () => {
    const result = getAddressTypeBadge('hotel', t);
    expect(result.emoji).toBe('🏨');
    expect(result.label).toBe('addresses.filters.hotel');
  });

  it('should return label and emoji for activity', () => {
    const result = getAddressTypeBadge('activity', t);
    expect(result.emoji).toBe('🏄');
    expect(result.label).toBe('addresses.filters.activity');
  });

  it('should return label and emoji for transport', () => {
    const result = getAddressTypeBadge('transport', t);
    expect(result.emoji).toBe('🚗');
    expect(result.label).toBe('addresses.filters.transport');
  });

  it('should return default pin emoji for other and unknown types', () => {
    expect(getAddressTypeBadge('other', t).emoji).toBe('📍');
    expect(getAddressTypeBadge('unknown' as any, t).emoji).toBe('📍');
  });
});
