import { calculateBulkSmsCost, calculateSms } from './sms-calculator';

describe('calculateSms', () => {
  it('should count a short English message as one GSM-7 part', () => {
    const result = calculateSms('Hello world');

    expect(result.encoding).toBe('GSM-7');
    expect(result.messageLength).toBe(11);
    expect(result.parts).toBe(1);
    expect(result.creditsPerPart).toBe(1);
    expect(result.totalCredits).toBe(1);
  });

  it('should count a 200-character English message as two parts', () => {
    const result = calculateSms('A'.repeat(200));

    expect(result.encoding).toBe('GSM-7');
    expect(result.messageLength).toBe(200);
    expect(result.parts).toBe(2);
    expect(result.totalCredits).toBe(2);
  });

  it('should count 160 GSM-7 characters as one part', () => {
    const result = calculateSms('A'.repeat(160));

    expect(result.messageLength).toBe(160);
    expect(result.parts).toBe(1);
  });

  it('should count 161 GSM-7 characters as two parts', () => {
    const result = calculateSms('A'.repeat(161));

    expect(result.messageLength).toBe(161);
    expect(result.parts).toBe(2);
  });

  it('should count 306 GSM-7 characters as two parts', () => {
    const result = calculateSms('A'.repeat(306));

    expect(result.messageLength).toBe(306);
    expect(result.parts).toBe(2);
  });

  it('should count 307 GSM-7 characters as three parts', () => {
    const result = calculateSms('A'.repeat(307));

    expect(result.messageLength).toBe(307);
    expect(result.parts).toBe(3);
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

  it('should count a 70-character Unicode message as one part', () => {
    const result = calculateSms('क'.repeat(70));

    expect(result.encoding).toBe('UNICODE');
    expect(result.messageLength).toBe(70);
    expect(result.parts).toBe(1);
  });

  it('should count a 71-character Unicode message as two parts', () => {
    const result = calculateSms('क'.repeat(71));

    expect(result.encoding).toBe('UNICODE');
    expect(result.messageLength).toBe(71);
    expect(result.parts).toBe(2);
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

  it('should reject a whitespace-only message', () => {
    expect(() => calculateSms('   ')).toThrow('Message must not be empty');
  });

  it('should calculate bulk SMS cost for multiple recipients', () => {
    expect(calculateBulkSmsCost('Hello', 3)).toBe(3);
  });

  it('should calculate bulk SMS cost using the number of SMS parts', () => {
    expect(calculateBulkSmsCost('A'.repeat(200), 3)).toBe(6);
  });

  it('should calculate bulk SMS cost for extension characters', () => {
    expect(calculateBulkSmsCost('^'.repeat(81), 3)).toBe(6);
  });

  it('should reject a zero recipient count', () => {
    expect(() => calculateBulkSmsCost('Hello', 0)).toThrow(
      'Recipient count must be a positive integer',
    );
  });

  it('should reject a negative recipient count', () => {
    expect(() => calculateBulkSmsCost('Hello', -1)).toThrow(
      'Recipient count must be a positive integer',
    );
  });

  it('should reject a fractional recipient count', () => {
    expect(() => calculateBulkSmsCost('Hello', 1.5)).toThrow(
      'Recipient count must be a positive integer',
    );
  });
});
