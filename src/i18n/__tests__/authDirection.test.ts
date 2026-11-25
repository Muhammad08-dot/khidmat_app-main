import React from 'react';
import { View, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
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

    it('renders +92 phone container with real LTR isolation props even when lang is Urdu', async () => {
      await render(
        React.createElement(
          View,
          { testID: 'phone-wrap', style: PHONE_CONTAINER_STYLE },
          React.createElement(Text, { testID: 'phone-prefix', style: PHONE_TEXT_STYLE }, '+92')
        )
      );
      expect(screen.getByTestId('phone-wrap').props.style).toEqual(
        expect.objectContaining({ direction: 'ltr', flexDirection: 'row' })
      );
      expect(screen.getByTestId('phone-prefix').props.style).toEqual(
        expect.objectContaining({ writingDirection: 'ltr', textAlign: 'left' })
      );
      expect(screen.getByText('+92')).toBeTruthy();
    });
  });
});
