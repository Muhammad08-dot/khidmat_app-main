# Khidmat UI TestIDs Specification (PRD v2 / W1-4)

This registry catalogs all automated `testID` selectors used by unit, component, integration, and E2E Maestro/Playwright test suites.

---

## 1. Authentication Screens (`app/(auth)/auth.tsx`)

| Selector | Element Type | Purpose / Description |
| :--- | :--- | :--- |
| `auth-email-input` | `TextInput` / `Input` | Email address field on login screen |
| `auth-password-input` | `TextInput` / `Input` | Password field on login screen |
| `auth-forgot-password` | `Pressable` | "Forgot password?" password reset trigger |
| `auth-login-button` | `Pressable` / `Button` | Primary action button to authenticate existing user |
| `auth-google-button` | `Pressable` / `GoogleButton` | Official Google OAuth sign-in button |
| `auth-demo-button` | `Pressable` / `Button` | 1-Tap Quick Demo Login button (dev-only gated) |
| `auth-switch-button` | `Pressable` | Toggles between Login and Multi-step Signup modes |
| `signup-step-indicator` | `View` / `StepIndicator` | 3-step progress bar on signup screen |
| `segment-customer` | `Pressable` | Selects "I need a service" (Client account) |
| `segment-provider` | `Pressable` | Selects "I offer services" (Provider account) |
| `signup-name-input` | `TextInput` / `Input` | Full name input on signup step 0 |
| `signup-phone-input` | `TextInput` | Pakistani mobile phone input (+92 prefix) |
| `signup-email-input` | `TextInput` / `Input` | Email address field on signup step 0 |
| `signup-password-input` | `TextInput` / `Input` | Password field with strength indicator on signup step 0 |
| `signup-next-button` | `Pressable` / `Button` | Validates step and navigates to next step |
| `signup-back-button` | `Pressable` / `Button` | Navigates back to previous signup step |
| `signup-submit-button` | `Pressable` / `Button` | Submits complete registration payload |

---

## 2. Customer Home Screen (`src/components/features/CustomerHome.tsx`)

| Selector | Element Type | Purpose / Description |
| :--- | :--- | :--- |
| `home-greeting` | `Text` | Displays user name and greeting |
| `home-location-pill` | `Pressable` | Shows current operational city (e.g. Lahore, Karachi) |
| `home-search-input` | `TextInput` | Real-time text search for trades and services |
| `home-voice-button` | `Pressable` | Voice command / demo query dialog trigger |
| `home-recent-activity` | `View` | Recent bookings live tracking strip |
| `home-category-chip` | `Pressable` | Individual category shortcut (Electrician, Plumber, etc.) |
| `home-provider-card` | `Pressable` / `ProviderCard` | Top-rated provider card in nearby list |

---

## 3. Provider Home Screen (`src/components/features/ProviderHome.tsx`)

| Selector | Element Type | Purpose / Description |
| :--- | :--- | :--- |
| `provider-online-toggle` | `Pressable` | Prominent availability switch (Online / Offline) |
| `provider-kyc-banner` | `View` | KYC identity verification status indicator |
| `provider-earnings-card` | `View` / `Card` | Summary card for total cash-settled earnings |
| `provider-jobs-card` | `View` / `Card` | Summary card for total completed jobs |
| `provider-accept-button` | `Pressable` / `Button` | Accepts incoming customer job request |
| `provider-decline-button`| `Pressable` / `Button` | Declines incoming customer job request |
| `provider-complete-button`| `Pressable` / `Button`| Opens completion proof modal |

---

## 4. Booking & Tracking Screens (`app/(booking)/`)

| Selector | Element Type | Purpose / Description |
| :--- | :--- | :--- |
| `booking-date-chip` | `Pressable` | Selects service appointment date |
| `booking-timeslot-option`| `Pressable` | Selects morning, afternoon, or evening window |
| `booking-address-input` | `TextInput` / `Input` | Specific house, street, and area input |
| `booking-confirm-button`| `Pressable` / `Button` | Locks booking and creates database record |
| `tracking-sos-button` | `Pressable` | Emergency 15 direct dialing button |
| `tracking-call-button` | `Pressable` | Direct phone dialer to customer / provider |
| `tracking-chat-button` | `Pressable` | Navigates to live booking chat thread |

---

## 5. UI Primitives (`src/components/ui/`)

| Selector | Element Type | Purpose / Description |
| :--- | :--- | :--- |
| `ui-button` | `Pressable` / `Button` | Generic accessible button |
| `ui-input` | `TextInput` / `Input` | Generic input field |
| `ui-chip` | `Pressable` / `Chip` | Interactive filter chip |
