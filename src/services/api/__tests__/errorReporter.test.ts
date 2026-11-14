// @ts-nocheck
import { scrubPII } from '../errorReporter';

describe('Error Reporter PII Scrubbing', () => {
  it('redacts Pakistani CNIC numbers from error messages', () => {
    const raw = 'Failed to process provider CNIC 35202-1234567-1 in database';
    expect(scrubPII(raw)).toBe('Failed to process provider CNIC [REDACTED_CNIC] in database');

    const rawUnformatted = 'CNIC: 3520212345671 found';
    expect(scrubPII(rawUnformatted)).toBe('CNIC: [REDACTED_CNIC] found');
  });

  it('redacts Pakistani mobile phone numbers', () => {
    const raw1 = 'SMS failed to dispatch to +923001234567';
    expect(scrubPII(raw1)).toBe('SMS failed to dispatch to [REDACTED_PHONE]');

    const raw2 = 'Caller number: 0321-5551122';
    expect(scrubPII(raw2)).toBe('Caller number: [REDACTED_PHONE]');
  });

  it('redacts JWT and bearer tokens', () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignatureValue';
    const raw = `Authorization header Bearer ${fakeToken} failed`;
    expect(scrubPII(raw)).toBe('Authorization header Bearer [REDACTED_TOKEN] failed');
  });

  it('redacts email addresses', () => {
    const raw = 'User ali.raza@example.com cannot update address';
    expect(scrubPII(raw)).toBe('User [REDACTED_EMAIL] cannot update address');
  });

  it('redacts street addresses with numbers', () => {
    const raw = 'Failed at House 42, Street 5, DHA Phase 5, Lahore';
    expect(scrubPII(raw)).toContain('[REDACTED_ADDRESS]');
  });
});
