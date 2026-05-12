import {
  formatPhoneNumber,
  isEmailValid,
  isNameValid,
  isPasswordPresent,
  isPasswordStrong,
  isPhoneValid,
} from '../authValidators';

describe('isEmailValid', () => {
  it('should return true when email is valid', () => {
    expect(isEmailValid('user@example.com')).toBe(true);
    expect(isEmailValid('user.name+tag@sub.domain.org')).toBe(true);
  });

  it('should return false when email is missing @', () => {
    expect(isEmailValid('userexample.com')).toBe(false);
  });

  it('should return false when email has no TLD', () => {
    expect(isEmailValid('user@example')).toBe(false);
  });

  it('should return false when email is empty', () => {
    expect(isEmailValid('')).toBe(false);
  });
});

describe('isPasswordPresent', () => {
  it('should return true when password is not empty', () => {
    expect(isPasswordPresent('abc')).toBe(true);
  });

  it('should return false when password is empty', () => {
    expect(isPasswordPresent('')).toBe(false);
  });
});

describe('isPasswordStrong', () => {
  it('should return true when password meets all criteria', () => {
    expect(isPasswordStrong('Abcdef1!')).toBe(true);
  });

  it('should return false when password has no uppercase', () => {
    expect(isPasswordStrong('abcdef1!')).toBe(false);
  });

  it('should return false when password has no special character', () => {
    expect(isPasswordStrong('Abcdef12')).toBe(false);
  });

  it('should return false when password is shorter than 8 characters', () => {
    expect(isPasswordStrong('Ab1!')).toBe(false);
  });
});

describe('isNameValid', () => {
  it('should return true when name has at least 2 characters', () => {
    expect(isNameValid('Al')).toBe(true);
  });

  it('should return false when name is a single character', () => {
    expect(isNameValid('A')).toBe(false);
  });

  it('should return false when name is only whitespace', () => {
    expect(isNameValid('   ')).toBe(false);
  });
});

describe('isPhoneValid', () => {
  it('should return true when phone is empty (field is optional)', () => {
    expect(isPhoneValid('')).toBe(true);
    expect(isPhoneValid('   ')).toBe(true);
  });

  it('should return true when phone has a valid format', () => {
    expect(isPhoneValid('+33 6 12 34 56 78')).toBe(true);
    expect(isPhoneValid('0612345678')).toBe(true);
  });

  it('should return false when phone contains invalid characters', () => {
    expect(isPhoneValid('abc')).toBe(false);
  });
});

describe('formatPhoneNumber', () => {
  it('should format digits by groups of two', () => {
    expect(formatPhoneNumber('0612345678')).toBe('06 12 34 56 78');
  });

  it('should strip non-digit characters', () => {
    expect(formatPhoneNumber('+33612345678')).toBe('33 61 23 45 67');
  });

  it('should truncate to 10 digits maximum', () => {
    expect(formatPhoneNumber('12345678901234')).toBe('12 34 56 78 90');
  });
});
