import { supabase } from './client';
import { handleServiceError } from '../errors';

export const USER_MEDIA_BUCKETS = ['kyc-documents', 'avatars', 'job_media'] as const;

export interface AccountDeletionResult {
  storageFilesRemoved: number;
  rpcDeleted: boolean;
  authDeleted: boolean;
}

/**
 * Purges all files owned by `userId` under `userId/` prefix across the
 * user media buckets via the Supabase Storage API (never raw SQL).
 */
export async function purgeUserStorageFiles(userId: string): Promise<number> {
  if (!userId) {
    throw new Error('userId is required to purge storage files.');
  }

  let removedCount = 0;

  for (const bucket of USER_MEDIA_BUCKETS) {
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(userId, { limit: 100 });

    if (listError) {
      handleServiceError(listError);
    }

    const paths = (files ?? [])
      .filter((item) => Boolean(item.name))
      .map((item) => `${userId}/${item.name}`);

    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
      if (removeError) {
        handleServiceError(removeError);
      }
      removedCount += paths.length;
    }
  }

  return removedCount;
}

/**
 * Full account deletion flow:
 * 1. Removes the user's files from `kyc-documents`, `avatars`, and `job_media` via Storage API.
 * 2. Calls `delete_user_account(p_user_id)` RPC to anonymize booking PII and delete profile rows.
 * 3. Invokes the `delete-account` Supabase Edge Function to delete the `auth.users` record
 *    using the service role key.
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
    body: { userId },
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
