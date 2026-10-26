export type SmsEncoding = 'GSM-7' | 'UNICODE';

export interface SmsCalculation {
  encoding: SmsEncoding;
  messageLength: number;
  parts: number;
  creditsPerPart: number;
  totalCredits: number;
}

const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ ' +
  '!"#¤%&\'()*+,-./0123456789:;<=>?¡' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿' +
  'abcdefghijklmnopqrstuvwxyzäöñüà';

const GSM_EXTENSION = new Set([
  '\f',
  '^',
  '{',
  '}',
  '\\',
  '[',
  '~',
  ']',
  '|',
  '€',
]);

// The assignment does not specify a price per SMS part.
// We use 1 credit per part as an initial, documented assumption.
const CREDITS_PER_PART = 1;

function isGsm7(message: string): boolean {
  for (const character of message) {
    if (!GSM_BASIC.includes(character) && !GSM_EXTENSION.has(character)) {
      return false;
    }
  }

  return true;
}

function countGsmSeptets(message: string): number {
  let septets = 0;

  for (const character of message) {
    septets += GSM_EXTENSION.has(character) ? 2 : 1;
  }

  return septets;
}

export function calculateSms(message: string): SmsCalculation {
  if (typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('Message must not be empty');
  }

  const gsm = isGsm7(message);

  // JavaScript string.length counts UTF-16 code units.
  // This also accounts for surrogate pairs used by many emoji.
  const messageLength = gsm ? countGsmSeptets(message) : message.length;

  const singlePartLimit = gsm ? 160 : 70;
  const multipartLimit = gsm ? 153 : 67;

  const parts =
    messageLength <= singlePartLimit
      ? 1
      : Math.ceil(messageLength / multipartLimit);

  return {
    encoding: gsm ? 'GSM-7' : 'UNICODE',
    messageLength,
    parts,
    creditsPerPart: CREDITS_PER_PART,
    totalCredits: parts * CREDITS_PER_PART,
  };
}

export function calculateBulkSmsCost(
  message: string,
  recipientCount: number,
): number {
  if (!Number.isInteger(recipientCount) || recipientCount < 1) {
    throw new Error('Recipient count must be a positive integer');
  }

  return calculateSms(message).totalCredits * recipientCount;
}
