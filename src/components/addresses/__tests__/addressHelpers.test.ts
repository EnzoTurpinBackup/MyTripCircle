import {
  getTypeIcon,
  getIconColors,
  getTagColors,
  getTagLabel,
  getMarkerColor,
  getChipDotColor,
  MOSS,
  SKY,
} from '../addressHelpers';

const t = (key: string) => key;

describe('getTypeIcon', () => {
  it('should return the correct icon for each address type', () => {
    expect(getTypeIcon('hotel')).toBe('bed-outline');
    expect(getTypeIcon('restaurant')).toBe('restaurant-outline');
    expect(getTypeIcon('activity')).toBe('ticket-outline');
    expect(getTypeIcon('transport')).toBe('car-outline');
    expect(getTypeIcon('other')).toBe('location-outline');
  });

  it('should return location-outline as default', () => {
    expect(getTypeIcon('unknown' as any)).toBe('location-outline');
  });
});

describe('getIconColors', () => {
  it('should return sky colors for hotel', () => {
    const result = getIconColors('hotel');
    expect(result.icon).toBe(SKY);
  });

  it('should return moss colors for activity', () => {
    const result = getIconColors('activity');
    expect(result.icon).toBe(MOSS);
  });

  it('should return restaurant palette colors', () => {
    const result = getIconColors('restaurant');
    expect(result.bg).toBe('#F5E5DC');
    expect(result.icon).toBe('#C4714A');
  });

  it('should return null colors for other types', () => {
    const result = getIconColors('other');
    expect(result.bg).toBeNull();
    expect(result.icon).toBeNull();
  });
});

describe('getTagColors', () => {
  it('should return sky colors for hotel', () => {
    expect(getTagColors('hotel').text).toBe(SKY);
  });

  it('should return moss colors for activity', () => {
    expect(getTagColors('activity').text).toBe(MOSS);
  });

  it('should return restaurant tag colors', () => {
    const result = getTagColors('restaurant');
    expect(result.bg).toBe('#F5E5DC');
    expect(result.text).toBe('#A35830');
  });

  it('should return null colors for transport', () => {
    expect(getTagColors('transport').bg).toBeNull();
  });
});

describe('getTagLabel', () => {
  it('should call t with the correct i18n key', () => {
    expect(getTagLabel('hotel', t)).toBe('addresses.filters.hotel');
    expect(getTagLabel('restaurant', t)).toBe('addresses.filters.restaurant');
    expect(getTagLabel('activity', t)).toBe('addresses.filters.activity');
  });
});

describe('getMarkerColor', () => {
  it('should return the correct color for each type', () => {
    expect(getMarkerColor('hotel')).toBe(SKY);
    expect(getMarkerColor('activity')).toBe(MOSS);
    expect(getMarkerColor('restaurant')).toBe('#C4714A');
  });

  it('should return the default brown color for transport, other and unknown', () => {
    expect(getMarkerColor('transport')).toBe('#8B7355');
    expect(getMarkerColor('other')).toBe('#8B7355');
    expect(getMarkerColor('unknown' as any)).toBe('#8B7355');
  });
});

describe('getChipDotColor', () => {
  it('should return the correct color for filterable types', () => {
    expect(getChipDotColor('hotel')).toBe(SKY);
    expect(getChipDotColor('restaurant')).toBe('#C4714A');
    expect(getChipDotColor('activity')).toBe(MOSS);
  });

  it('should return null for other filter values', () => {
    expect(getChipDotColor('other')).toBeNull();
    expect(getChipDotColor('all')).toBeNull();
  });
});
