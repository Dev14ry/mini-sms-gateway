export function normalizeNepaliPhoneNumber(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Phone number must be a string');
  }

  const number = input.trim();

  let normalized: string;

  if (number.startsWith('+977')) {
    normalized = number.slice(4);
  } else if (number.startsWith('977')) {
    normalized = number.slice(3);
  } else {
    normalized = number;
  }

  if (!/^9[78]\d{8}$/.test(normalized)) {
    throw new Error(`Invalid Nepali mobile number: ${input}`);
  }

  return normalized;
}
