/**
 * Payments service — COD is the live path; JazzCash/EasyPaisa wallet flows
 * are gated behind EXPO_PUBLIC_PAYMENTS_ENABLED and require merchant
 * credentials held server-side (agent-server), never in the mobile bundle.
 */
import { supabase } from './supabase/client';

export type PaymentMethod = 'cod' | 'jazzcash' | 'easypaisa';

const PAYMENTS_ENABLED = process.env.EXPO_PUBLIC_PAYMENTS_ENABLED === 'true';
const AGENT_SERVER_URL = process.env.EXPO_PUBLIC_AGENT_SERVER_URL || '';

export const isPaymentsEnabled = (): boolean => PAYMENTS_ENABLED;

/** Records the standard Cash-on-Delivery settlement against a booking. */
export async function recordCodSettlement(
  bookingId: string,
  payerId: string,
  amount: number
): Promise<void> {
  const { error } = await supabase.from('payments').insert({
    booking_id: bookingId,
    payer_id: payerId,
    method: 'cod',
    amount: Math.round(amount),
    status: 'completed',
  });
  if (error) throw error;
}

export interface WalletInitResult {
  ok: boolean;
  reason?: string;
  redirectUrl?: string;
  reference?: string;
}

/**
 * Asks the agent-server to open a JazzCash/EasyPaisa transaction. The server
 * returns 501/not_configured until real merchant credentials are present.
 */
export async function initiateWalletPayment(
  bookingId: string,
  amount: number,
  method: Exclude<PaymentMethod, 'cod'>
): Promise<WalletInitResult> {
  if (!PAYMENTS_ENABLED) {
    return { ok: false, reason: 'Wallet payments are not enabled yet.' };
  }
  if (!AGENT_SERVER_URL) {
    return { ok: false, reason: 'Payments server URL is not configured.' };
  }
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch(`${AGENT_SERVER_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ bookingId, amount, method }),
    });
    const json = (await res.json()) as {
      orderString?: string;
      error?: string;
      detail?: string;
    };
    if (!res.ok) {
      return { ok: false, reason: json?.error || json?.detail || 'Payments unavailable.' };
    }
    if (json?.orderString) {
      // The gateway app-link URL scheme wraps the ordered parameter string.
      const gatewayBase =
        method === 'jazzcash'
          ? 'https://jazz.com.pk/jazzcash/app-payments/initiate'
          : 'https://easypaisa.com.pk/easypay/installment.initiate';
      return {
        ok: true,
        redirectUrl: `${gatewayBase}?${json.orderString}`,
        reference: bookingId,
      };
    }
    return { ok: false, reason: 'Payments server returned no order payload.' };
  } catch (err) {
    return { ok: false, reason: 'Could not reach the payments server.' };
  }
}
