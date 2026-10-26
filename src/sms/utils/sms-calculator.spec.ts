import { calculateBulkSmsCost, calculateSms } from './sms-calculator';

describe('calculateSms', () => {
  it('should count a short English message as one GSM-7 part', () => {
    const result = calculateSms('Hello world');

    expect(result.encoding).toBe('GSM-7');
    expect(result.parts).toBe(1);
    expect(result.totalCredits).toBe(1);
  });

  it('should count a 200-character English message as two parts', () => {
    const result = calculateSms('A'.repeat(200));

    expect(result.encoding).toBe('GSM-7');
    expect(result.messageLength).toBe(200);
    expect(result.parts).toBe(2);
  });

  it('should count 160 GSM-7 characters as one part', () => {
    expect(calculateSms('A'.repeat(160)).parts).toBe(1);
  });

  it('should count 161 GSM-7 characters as two parts', () => {
    expect(calculateSms('A'.repeat(161)).parts).toBe(2);
  });

  it('should count extension characters as two septets each', () => {
    const result = calculateSms('^'.repeat(81));

    expect(result.encoding).toBe('GSM-7');
    expect(result.messageLength).toBe(162);
    expect(result.parts).toBe(2);
  });

  it('should use Unicode encoding for Nepali messages', () => {
    const result = calculateSms('नमस्ते');

    expect(result.encoding).toBe('UNICODE');
    expect(result.parts).toBe(1);
  });

  it('should count a 100-character Unicode message as two parts', () => {
    const result = calculateSms('क'.repeat(100));

    expect(result.encoding).toBe('UNICODE');
    expect(result.parts).toBe(2);
  });

  it('should use Unicode encoding if a message contains an emoji', () => {
    const result = calculateSms('Hello 😀');

    expect(result.encoding).toBe('UNICODE');
    expect(result.parts).toBe(1);
  });

  it('should reject an empty message', () => {
    expect(() => calculateSms('')).toThrow('Message must not be empty');
  });

  it('should calculate bulk SMS cost for multiple recipients', () => {
    expect(calculateBulkSmsCost('Hello', 3)).toBe(3);
  });

  it('should reject an invalid recipient count', () => {
    expect(() => calculateBulkSmsCost('Hello', 0)).toThrow(
      'Recipient count must be a positive integer',
    );
  });
});
