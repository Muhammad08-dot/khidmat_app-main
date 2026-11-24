import { isRTL, getLogicalTextAlign, PHONE_CONTAINER_STYLE, PHONE_TEXT_STYLE } from '../direction';

describe('Auth direction and alignment rendering (P1-2)', () => {
  describe('English (LTR) rendering expectations', () => {
    const lang = 'en';
    const rtl = isRTL(lang);
    const textAlign = getLogicalTextAlign(rtl);

    it('uses LTR direction flags', () => {
      expect(rtl).toBe(false);
      expect(textAlign).toBe('left');
    });

    it('preserves +92 prefix and phone container LTR isolation', () => {
      expect(PHONE_CONTAINER_STYLE.direction).toBe('ltr');
      expect(PHONE_CONTAINER_STYLE.flexDirection).toBe('row');
      expect(PHONE_TEXT_STYLE.writingDirection).toBe('ltr');
      expect(PHONE_TEXT_STYLE.textAlign).toBe('left');
    });
  });

  describe('Urdu (RTL) rendering expectations', () => {
    const lang = 'ur';
    const rtl = isRTL(lang);
    const textAlign = getLogicalTextAlign(rtl);

    it('uses RTL direction flags', () => {
      expect(rtl).toBe(true);
      expect(textAlign).toBe('right');
    });

    it('preserves strict LTR isolation for phone numbers so +92 does not invert to 92+', () => {
      // Regardless of RTL being true for Urdu strings, phone container MUST stay LTR
      expect(PHONE_CONTAINER_STYLE.direction).toBe('ltr');
      expect(PHONE_CONTAINER_STYLE.flexDirection).toBe('row');
      expect(PHONE_TEXT_STYLE.writingDirection).toBe('ltr');
      expect(PHONE_TEXT_STYLE.textAlign).toBe('left');
    });
  });
});
