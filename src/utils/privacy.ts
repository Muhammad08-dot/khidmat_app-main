/**
 * src/utils/privacy.ts
 * Privacy and PII masking utilities for user data & compliance.
 */

/**
 * Validates whether a given string is a valid Pakistani CNIC (13 digits, optional dashes).
 * Pattern: XXXXX-XXXXXXX-X or 13 consecutive digits starting with 1-7.
 */
export function isValidCnic(cnic: string): boolean {
  if (!cnic || typeof cnic !== 'string') return false;
  const digits = cnic.replace(/\D/g, '');
  if (digits.length !== 13) return false;
  // Pakistani CNIC first digit indicates province (1 to 7)
  const firstDigit = parseInt(digits[0], 10);
  return firstDigit >= 1 && firstDigit <= 7;
}

/**
 * Formats a 13-digit raw CNIC string into standard XXXXX-XXXXXXX-X format.
 */
export function formatCnic(cnic: string): string {
  if (!cnic) return '';
  const digits = cnic.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

/**
 * Masks a Pakistani CNIC for secure display, showing the district prefix and gender suffix
 * while masking the 7 personal sequence digits in the middle.
 *
 * Example:
 *   "35202-1234567-1" -> "35202-*******-1"
 *   "3520212345671"   -> "35202-*******-1"
 *
 * @param cnic Raw or formatted CNIC
 * @param maskChar Character to mask with (default: '*')
 */
export function maskCnic(cnic: string, maskChar = '*'): string {
  if (!cnic || typeof cnic !== 'string') return '';
  const digits = cnic.replace(/\D/g, '');
  if (digits.length !== 13) {
    // If not a full 13-digit CNIC, return masked string or fallback
    return cnic.length > 4 ? `${cnic.slice(0, 2)}${maskChar.repeat(cnic.length - 4)}${cnic.slice(-2)}` : cnic;
  }
  const prefix = digits.slice(0, 5);
  const suffix = digits.slice(12, 13);
  const maskedMiddle = maskChar.repeat(7);
  return `${prefix}-${maskedMiddle}-${suffix}`;
}

/**
 * Masks a phone number for secure display.
 * Example: "+923001234567" -> "+92 300 ****567"
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.trim();
  if (cleaned.length < 7) return cleaned;
  return `${cleaned.slice(0, 6)}****${cleaned.slice(-3)}`;
}

