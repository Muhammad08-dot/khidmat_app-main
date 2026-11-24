import { isRTL, syncDirection, getLogicalTextAlign, PHONE_CONTAINER_STYLE, PHONE_TEXT_STYLE } from '../direction';
import { I18nManager } from 'react-native';

describe('direction utilities (P1-2)', () => {
  it('identifies Urdu as RTL', () => {
    expect(isRTL('ur')).toBe(true);
  });

  it('identifies English as LTR', () => {
    expect(isRTL('en')).toBe(false);
  });

  it('treats null or undefined as LTR', () => {
    expect(isRTL(null)).toBe(false);
    expect(isRTL(undefined)).toBe(false);
    expect(isRTL('')).toBe(false);
  });

  it('returns proper text alignment based on direction', () => {
    expect(getLogicalTextAlign(true)).toBe('right');
    expect(getLogicalTextAlign(false)).toBe('left');
  });

  it('provides strict LTR isolation for phone numbers', () => {
    expect(PHONE_CONTAINER_STYLE.direction).toBe('ltr');
    expect(PHONE_CONTAINER_STYLE.flexDirection).toBe('row');
    expect(PHONE_TEXT_STYLE.writingDirection).toBe('ltr');
    expect(PHONE_TEXT_STYLE.textAlign).toBe('left');
  });

  it('calls I18nManager allowRTL and forceRTL when needed', () => {
    const allowSpy = jest.spyOn(I18nManager, 'allowRTL');
    const forceSpy = jest.spyOn(I18nManager, 'forceRTL');

    syncDirection('ur');
    expect(allowSpy).toHaveBeenCalledWith(true);
    expect(forceSpy).toHaveBeenCalledWith(true);

    syncDirection('en');
    expect(allowSpy).toHaveBeenCalledWith(false);
    expect(forceSpy).toHaveBeenCalledWith(false);

    allowSpy.mockRestore();
    forceSpy.mockRestore();
  });
});
