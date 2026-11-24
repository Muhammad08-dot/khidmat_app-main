import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { setLang } from '@/src/i18n';

// Screens to test
import AuthScreen from '@/app/(auth)/auth';
import { CustomerHome } from '@/src/components/features/CustomerHome';
import { ProviderHome } from '@/src/components/features/ProviderHome';
import ConfirmBookingScreen from '@/app/(booking)/booking';
import LiveTrackingScreen from '@/app/(booking)/track/[id]';

// Mocks
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({
    providerId: 'prov-1',
    id: 'book-1',
  }),
}));

jest.mock('@/src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    userProfile: {
      id: 'test-user-id',
      name: 'Ahmed Khan',
      phone: '+923001234567',
      role: 'customer',
      city: 'Lahore',
      location: { lat: 31.5204, lng: 74.3587 },
      current_mode: 'customer',
    },
    updateProfile: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({}),
    signUp: jest.fn().mockResolvedValue({}),
    signOut: jest.fn().mockResolvedValue({}),
  }),
}));

jest.mock('@/src/services/supabase/legacy', () => ({
  getDocument: jest.fn().mockResolvedValue({
    userId: 'prov-1',
    name: 'Tariq Electrician',
    category: 'Electrician',
    city: 'Lahore',
    basePrice: 500,
    rating: 4.8,
    tier: 'Gold',
    location: { lat: 31.5204, lng: 74.3587 },
  }),
  listenToBookings: jest.fn((field, id, cb) => {
    cb([
      {
        bookingId: 'book-1',
        customerId: 'test-user-id',
        customerName: 'Ahmed Khan',
        customerPhone: '+923001234567',
        providerId: 'prov-1',
        providerName: 'Tariq Electrician',
        providerCategory: 'Electrician',
        date: '2026-11-25',
        timeSlot: '10:00 AM - 12:00 PM',
        address: 'Model Town, Lahore',
        status: 'confirmed',
        totalPrice: 650,
        basePrice: 500,
        distanceKm: 3.2,
      },
    ]);
    return () => {};
  }),
  writeDocument: jest.fn().mockResolvedValue('new-booking-id'),
  uploadJobMedia: jest.fn().mockResolvedValue('https://example.com/job.jpg'),
  mergeBookingMeta: jest.fn().mockResolvedValue({}),
  createNotification: jest.fn().mockResolvedValue({}),
  submitProviderReview: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/src/hooks/useSupabase', () => ({
  useBookings: () => ({
    data: [
      {
        bookingId: 'book-1',
        id: 'book-1',
        customerId: 'test-user-id',
        customerName: 'Ahmed Khan',
        customerPhone: '+923001234567',
        providerId: 'prov-1',
        providerName: 'Tariq Electrician',
        providerCategory: 'Electrician',
        date: '2026-11-25',
        timeSlot: '10:00 AM - 12:00 PM',
        address: 'Model Town, Lahore',
        status: 'confirmed',
        totalPrice: 650,
        basePrice: 500,
        distanceKm: 3.2,
      },
    ],
    isLoading: false,
    refetch: jest.fn(),
    isRefetching: false,
  }),
  useUpdateBookingStatus: () => ({
    mutateAsync: jest.fn(),
  }),
  useSendMessage: () => ({
    mutateAsync: jest.fn(),
  }),
}));

jest.mock('@/src/services/analytics', () => ({
  track: jest.fn(),
  AnalyticsEvents: {
    BOOKING_CREATED: 'BOOKING_CREATED',
  },
}));

jest.mock('@/src/utils/geolocation', () => ({
  getCurrentCoords: jest.fn().mockResolvedValue({ lat: 31.5204, lng: 74.3587 }),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  MediaTypeOptions: { Images: 'Images' },
}));

describe('Redesigned Screens Component Render Tests (P2 / Item 5)', () => {
  beforeEach(() => {
    setLang('en');
  });

  describe('English (LTR) Direction', () => {
    test('renders Auth screen in LTR mode', async () => {
      setLang('en');
      await render(<AuthScreen />);
      expect(screen.getByTestId('auth-email-input')).toBeTruthy();
      expect(screen.getByTestId('auth-password-input')).toBeTruthy();
      expect(screen.getByTestId('auth-login-button')).toBeTruthy();
      expect(screen.getByTestId('auth-google-button')).toBeTruthy();
      expect(screen.getByText('Welcome Back')).toBeTruthy();
    });

    test('renders CustomerHome screen in LTR mode', async () => {
      setLang('en');
      await render(<CustomerHome />);
      expect(screen.getByPlaceholderText('Search electrician, plumber, AC repair...')).toBeTruthy();
      expect(screen.getByText('Top Rated Near You')).toBeTruthy();
      expect(screen.getByText('Popular Services')).toBeTruthy();
      expect(screen.getByText('Lahore')).toBeTruthy();
    });

    test('renders ProviderHome screen in LTR mode', async () => {
      setLang('en');
      await render(<ProviderHome />);
      expect(screen.getByText('Total Earnings')).toBeTruthy();
      expect(screen.getByText('Active Jobs (1)')).toBeTruthy();
      expect(screen.getByText('KYC Document Verification Required')).toBeTruthy();
    });

    test('renders ConfirmBooking screen in LTR mode', async () => {
      setLang('en');
      await render(<ConfirmBookingScreen />);
      expect(await screen.findByText('Confirm Booking')).toBeTruthy();
    });

    test('renders LiveTracking screen in LTR mode', async () => {
      setLang('en');
      await render(<LiveTrackingScreen />);
      expect(screen.getByText('Live Service Tracking')).toBeTruthy();
      expect(screen.getByText('Khidmat Safety Shield (Emergency 15)')).toBeTruthy();
    });
  });

  describe('Urdu (RTL) Direction', () => {
    beforeEach(() => {
      setLang('ur');
    });

    test('renders Auth screen in RTL mode', async () => {
      setLang('ur');
      await render(<AuthScreen />);
      expect(screen.getByTestId('auth-email-input')).toBeTruthy();
      expect(screen.getByTestId('auth-password-input')).toBeTruthy();
      expect(screen.getByTestId('auth-login-button')).toBeTruthy();
    });

    test('renders CustomerHome screen in RTL mode', async () => {
      setLang('ur');
      await render(<CustomerHome />);
      expect(screen.getByText('Top Rated Near You')).toBeTruthy();
      expect(screen.getByText('Popular Services')).toBeTruthy();
    });

    test('renders ProviderHome screen in RTL mode', async () => {
      setLang('ur');
      await render(<ProviderHome />);
      expect(screen.getByText('Total Earnings')).toBeTruthy();
      expect(screen.getByText('Active Jobs (1)')).toBeTruthy();
    });

    test('renders ConfirmBooking screen in RTL mode', async () => {
      setLang('ur');
      await render(<ConfirmBookingScreen />);
      expect(screen.getByText('Confirm Booking')).toBeTruthy();
    });

    test('renders LiveTracking screen in RTL mode', async () => {
      setLang('ur');
      await render(<LiveTrackingScreen />);
      expect(screen.getByText('Live Service Tracking')).toBeTruthy();
      expect(screen.getByText('Khidmat Safety Shield (Emergency 15)')).toBeTruthy();
    });
  });
});
