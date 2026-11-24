import { maskCnic, isValidCnic, formatCnic, maskPhoneNumber } from '../privacy';

describe('Privacy and CNIC Masking Utilities (P3-3)', () => {
  it('correctly masks formatted 13-digit Pakistani CNIC', () => {
    const raw = '35202-1234567-1';
    expect(maskCnic(raw)).toBe('35202-*******-1');
  });

  it('correctly masks unformatted 13-digit CNIC', () => {
    const raw = '3520212345671';
    expect(maskCnic(raw)).toBe('35202-*******-1');
  });

  it('handles custom mask characters', () => {
    const raw = '35202-1234567-1';
    expect(maskCnic(raw, 'X')).toBe('35202-XXXXXXX-1');
  });

  it('handles empty or non-standard inputs gracefully', () => {
    expect(maskCnic('')).toBe('');
    expect(maskCnic('12345')).toBe('12*45');
  });

  it('validates Pakistani CNIC correctly', () => {
    expect(isValidCnic('35202-1234567-1')).toBe(true);
    expect(isValidCnic('3520212345671')).toBe(true);
    expect(isValidCnic('05202-1234567-1')).toBe(false); // 0 is invalid first digit
    expect(isValidCnic('85202-1234567-1')).toBe(false); // 8 is invalid first digit
    expect(isValidCnic('12345')).toBe(false);
  });

  it('formats raw digits to standard CNIC format', () => {
    expect(formatCnic('3520212345671')).toBe('35202-1234567-1');
    expect(formatCnic('35202')).toBe('35202');
    expect(formatCnic('352021234')).toBe('35202-1234');
  });

  it('masks phone numbers correctly', () => {
    expect(maskPhoneNumber('+923001234567')).toBe('+92300****567');
  });
});

