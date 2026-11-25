import { supabase } from './client';
import { handleServiceError } from '../errors';

export const USER_PREFIX_BUCKETS = ['kyc-documents', 'avatars'] as const;
export const BOOKING_MEDIA_BUCKET = 'job_media' as const;

export interface AccountDeletionResult {
  storageFilesRemoved: number;
  rpcDeleted: boolean;
  authDeleted: boolean;
}

async function removeFilesUnderPrefix(bucket: string, prefix: string): Promise<number> {
  const { data: files, error: listError } = await supabase.storage
    .from(bucket)
    .list(prefix, { limit: 100 });

  if (listError) {
    handleServiceError(listError);
  }

  const paths = (files ?? [])
    .filter((item) => Boolean(item.name))
    .map((item) => `${prefix}/${item.name}`);

  if (paths.length === 0) return 0;

  const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
  if (removeError) {
    handleServiceError(removeError);
  }

  return paths.length;
}

/**
 * Purges all files owned by `userId` via the Supabase Storage API (never raw SQL):
 * - `kyc-documents` and `avatars` are purged under `${userId}/`.
 * - `job_media` is keyed by `${bookingId}/`, so we query all bookings involving `userId`
 *   and purge those booking prefixes. (This also removes job proof photos from the
 *   counterparty's view for those bookings while preserving anonymized booking ledgers.)
 */
export async function purgeUserStorageFiles(userId: string): Promise<number> {
  if (!userId) {
    throw new Error('userId is required to purge storage files.');
  }

  let removedCount = 0;

  for (const bucket of USER_PREFIX_BUCKETS) {
    removedCount += await removeFilesUnderPrefix(bucket, userId);
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id')
    .or(`customer_id.eq.${userId},provider_id.eq.${userId}`);

  if (bookingsError) {
    handleServiceError(bookingsError);
  }

  for (const booking of bookings ?? []) {
    if (booking?.id) {
      removedCount += await removeFilesUnderPrefix(BOOKING_MEDIA_BUCKET, booking.id);
    }
  }

  return removedCount;
}

/**
 * Full account deletion flow (M2-4):
 * 1. Removes the user's files from `kyc-documents`, `avatars`, and `job_media` via Storage API.
 * 2. Calls `delete_user_account(p_user_id)` RPC to anonymize booking PII and delete profile rows.
 * 3. Invokes the `delete-account` Supabase Edge Function (derives userId from verified JWT)
 *    to delete the `auth.users` record using the service role key.
 */
export async function deleteUserAccountFlow(userId: string): Promise<AccountDeletionResult> {
  if (!userId) {
    throw new Error('userId is required to delete account.');
  }

  const storageFilesRemoved = await purgeUserStorageFiles(userId);

  const { data: rpcData, error: rpcError } = await supabase.rpc('delete_user_account', {
    p_user_id: userId,
  });

  if (rpcError) {
    handleServiceError(rpcError);
  }

  const { error: fnError } = await supabase.functions.invoke('delete-account', {
    body: {},
  });

  if (fnError) {
    handleServiceError(fnError);
  }

  return {
    storageFilesRemoved,
    rpcDeleted: Boolean(rpcData),
    authDeleted: true,
  };
}
