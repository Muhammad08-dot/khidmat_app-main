/**
 * src/services/supabase/kyc.ts
 * Hardened KYC Document Storage Service.
 * Interacts strictly with the private 'kyc-documents' bucket using signed URLs.
 */

import { supabase } from './client';
import { handleServiceError, ValidationError } from '../errors';

export const KYC_BUCKET = 'kyc-documents';
export const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 900; // 15 minutes per PRD / handoff contract

export interface KycUploadResult {
  path: string;
  signedUrl: string;
}

/**
 * Creates a time-limited signed URL for viewing a private KYC document.
 * @param path Storage object path (e.g., `${userId}/cnic_front.jpg`)
 * @param expiresIn Time in seconds until the URL expires (default: 900s / 15m)
 */
export async function createSignedKycUrl(
  path: string,
  expiresIn = DEFAULT_SIGNED_URL_EXPIRY_SECONDS
): Promise<string> {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    throw new ValidationError('KYC document path is required to generate signed URL');
  }

  try {
    const { data, error } = await supabase.storage
      .from(KYC_BUCKET)
      .createSignedUrl(path.trim(), expiresIn);

    if (error) {
      throw error;
    }

    if (!data?.signedUrl) {
      throw new Error('Failed to generate signed URL from storage provider');
    }

    return data.signedUrl;
  } catch (err) {
    throw handleServiceError(err, 'createSignedKycUrl');
  }
}

/**
 * Uploads a KYC document to the private bucket and returns its path and a signed URL.
 * @param userId User UUID (folder owner)
 * @param fileName Document file name (e.g., 'cnic_front.jpg')
 * @param fileBody Binary data or base64 payload
 * @param contentType MIME type (e.g., 'image/jpeg', 'image/png', 'application/pdf')
 */
export async function uploadKycDocument(
  userId: string,
  fileName: string,
  fileBody: Blob | ArrayBuffer | FormData | string,
  contentType = 'image/jpeg'
): Promise<KycUploadResult> {
  if (!userId || !fileName) {
    throw new ValidationError('userId and fileName are required for KYC upload');
  }

  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${sanitizedFileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(KYC_BUCKET)
      .upload(path, fileBody, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const signedUrl = await createSignedKycUrl(path);

    return {
      path,
      signedUrl,
    };
  } catch (err) {
    throw handleServiceError(err, 'uploadKycDocument');
  }
}

/**
 * Lists KYC documents uploaded for a specific user.
 */
export async function listUserKycDocuments(userId: string) {
  if (!userId) {
    throw new ValidationError('userId is required to list KYC documents');
  }

  try {
    const { data, error } = await supabase.storage
      .from(KYC_BUCKET)
      .list(userId, {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      throw error;
    }

    return data ?? [];
  } catch (err) {
    throw handleServiceError(err, 'listUserKycDocuments');
  }
}
