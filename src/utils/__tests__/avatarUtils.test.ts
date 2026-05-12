import { getInitials, getAvatarColor, AVATAR_COLORS } from '../avatarUtils';

describe('getInitials', () => {
  it('should return first letter of a single name', () => {
    expect(getInitials('Alice')).toBe('A');
  });

  it('should return first and last initials for a full name', () => {
    expect(getInitials('Alice Martin')).toBe('AM');
  });

  it('should use first and last word when more than two words', () => {
    expect(getInitials('Jean-Pierre De La Fontaine')).toBe('JF');
  });

  it('should return ? for empty string', () => {
    expect(getInitials('')).toBe('?');
  });

  it('should return ? for whitespace-only string', () => {
    expect(getInitials('   ')).toBe('?');
  });

  it('should return ? for null/undefined', () => {
    expect(getInitials(null as any)).toBe('?');
    expect(getInitials(undefined as any)).toBe('?');
  });

  it('should return uppercase initials', () => {
    expect(getInitials('alice martin')).toBe('AM');
  });

  it('should use empty string when the last name segment is missing from at(-1)', () => {
    const origAt = Array.prototype.at;
    const spy = jest.spyOn(Array.prototype, 'at').mockImplementation(function (this: unknown[], n: number) {
      if (n === -1) return undefined;
      return origAt.call(this, n);
    });
    expect(getInitials('Jane Doe')).toBe('J');
    spy.mockRestore();
  });
});

describe('getAvatarColor', () => {
  it('should return a color from the AVATAR_COLORS palette', () => {
    const color = getAvatarColor('Alice');
    expect(AVATAR_COLORS).toContain(color);
  });

  it('should return a consistent color for the same name', () => {
    expect(getAvatarColor('Alice')).toBe(getAvatarColor('Alice'));
  });

  it('should return the first color for empty string', () => {
    expect(getAvatarColor('')).toBe(AVATAR_COLORS[0]);
  });

  it('should return different colors for different names', () => {
    // Not guaranteed to be different for ALL names, but should be for these
    const colors = new Set(['Alice', 'Bob', 'Charlie', 'Dave', 'Eve'].map(getAvatarColor));
    expect(colors.size).toBeGreaterThan(1);
  });

  it('should treat a missing code point as 0 in the hash', () => {
    const orig = String.prototype.codePointAt;
    const spy = jest.spyOn(String.prototype, 'codePointAt').mockImplementation(function (this: string, pos: number) {
      if (pos === 0) return undefined as unknown as number;
      return orig.call(this, pos);
    });
    const color = getAvatarColor('Zoe');
    expect(AVATAR_COLORS).toContain(color);
    spy.mockRestore();
  });
});
