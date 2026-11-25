/* eslint-env jest, node */
import {
  calculateTravelFeePKR,
  estimateTravelTimeMinutes,
  getDistanceKm,
} from '../location';
import { maskCnic, maskPhoneNumber } from '../privacy';
import { parseAuthRedirectUrl } from '../authUrlParser';
import { averageRating, ratingDistribution } from '../ratings';

describe('QA pure-logic edge-case checks', () => {
  it('calculateTravelFeePKR and estimateTravelTimeMinutes handle zero/negative/positive distances', () => {
    expect(calculateTravelFeePKR(0)).toBe(100);
    expect(calculateTravelFeePKR(-5)).toBe(100);
    expect(calculateTravelFeePKR(10)).toBe(280);
    expect(estimateTravelTimeMinutes(0)).toBe(5);
    expect(estimateTravelTimeMinutes(10)).toBe(28);
  });

  it('getDistanceKm returns 0 for identical coordinates', () => {
    expect(getDistanceKm(31.5204, 74.3587, 31.5204, 74.3587)).toBe(0);
  });

  it('maskCnic and maskPhoneNumber redact middle characters without throwing on empty input', () => {
    expect(maskCnic('35202-1234567-1')).toBe('35202-*******-1');
    expect(maskPhoneNumber('+923001234567')).not.toContain('12345');
    expect(maskCnic('')).toBe('');
    expect(maskPhoneNumber('')).toBe('');
  });

  it('parseAuthRedirectUrl handles code, token fragment, error, and non-auth URLs', () => {
    expect(parseAuthRedirectUrl('khidmat://auth/callback?code=abc123').type).toBe('code');
    expect(
      parseAuthRedirectUrl('khidmat://auth/callback#access_token=at&refresh_token=rt').type
    ).toBe('token');
    expect(parseAuthRedirectUrl('khidmat://auth/callback?error=access_denied').type).toBe('error');
    expect(parseAuthRedirectUrl('not-a-valid-url').type).toBe('empty');
  });

  it('averageRating and ratingDistribution handle empty and mixed arrays', () => {
    expect(averageRating([])).toBe(0);
    expect(averageRating([5, 4, null, 3])).toBe(4);
    expect(ratingDistribution([5, 5, 4, 1])).toEqual({ 1: 1, 2: 0, 3: 0, 4: 1, 5: 2 });
  });
});
