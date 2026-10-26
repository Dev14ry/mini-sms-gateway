import { normalizeNepaliPhoneNumber } from './phone-number';

describe('normalizeNepaliPhoneNumber', () => {
  it('should accept a valid 98 mobile number', () => {
    expect(normalizeNepaliPhoneNumber('9841234567')).toBe('9841234567');
  });

  it('should accept a valid 97 mobile number', () => {
    expect(normalizeNepaliPhoneNumber('9761234567')).toBe('9761234567');
  });

  it('should remove the +977 prefix', () => {
    expect(normalizeNepaliPhoneNumber('+9779801122334')).toBe('9801122334');
  });

  it('should remove the 977 prefix', () => {
    expect(normalizeNepaliPhoneNumber('9779761234567')).toBe('9761234567');
  });

  it('should trim surrounding whitespace', () => {
    expect(normalizeNepaliPhoneNumber(' 9841234567 ')).toBe('9841234567');
  });

  it('should reject a number that does not start with 97 or 98', () => {
    expect(() => normalizeNepaliPhoneNumber('9612345678')).toThrow(
      'Invalid Nepali mobile number',
    );
  });

  it('should reject a number with an invalid length', () => {
    expect(() => normalizeNepaliPhoneNumber('984123456')).toThrow(
      'Invalid Nepali mobile number',
    );
  });

  it('should reject a number containing letters', () => {
    expect(() => normalizeNepaliPhoneNumber('98412abc67')).toThrow(
      'Invalid Nepali mobile number',
    );
  });
});
