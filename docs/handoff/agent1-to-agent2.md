# Handoff from Agent 1 (UI) to Agent 2 (Hardening)

## 1. KYC Storage & Integration (W1-5)
- **Bucket Usage:** The provider onboarding and verification UI in `app/(tabs)/profile.tsx` and `ProviderHome.tsx` references the private `kyc-documents` bucket created in migration `0013_kyc_and_security_hardening.sql`.
- **Private URLs:** All KYC CNIC images uploaded through the mobile UI require signed URLs generated via `createSignedUrl` with 15-minute expiration for owner and admin preview.
- **Cascade Deletion:** When a user invokes `deleteUserAccount()`, the UI expects the backend cascade trigger to clean up all storage objects under `kyc-documents/{userId}/*`.

## 2. Integration Test Script Addition
- As requested in your handoff note, root `package.json` has been updated with:
  `"test:integration": "jest --config jest.integration.config.js"`
- Developers can now execute cloud integration suites directly from repository root via `npm run test:integration`.

## 3. UI TestIDs Availability
- All UI interactive elements now provide deterministic `testID` properties cataloged in `docs/ui/TESTIDS.md` for Maestro and integration tests.
