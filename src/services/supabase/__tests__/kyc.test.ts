import {
  createSignedKycUrl,
  uploadKycDocument,
  listUserKycDocuments,
  KYC_BUCKET,
  DEFAULT_SIGNED_URL_EXPIRY_SECONDS,
} from '../kyc';
import { supabase } from '../client';
import { ValidationError, PermissionDeniedError } from '../../errors';

jest.mock('../client', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}));

describe('KYC Storage Service', () => {
  const mockStorageFrom = supabase.storage.from as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSignedKycUrl', () => {
    it('throws ValidationError when path is empty or invalid', async () => {
      await expect(createSignedKycUrl('')).rejects.toThrow(ValidationError);
      await expect(createSignedKycUrl('   ')).rejects.toThrow(ValidationError);
    });

    it('successfully calls createSignedUrl with default 900s expiry', async () => {
      const mockCreateSignedUrl = jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://test-signed-url.com/kyc' },
        error: null,
      });

      mockStorageFrom.mockReturnValue({
        createSignedUrl: mockCreateSignedUrl,
      });

      const url = await createSignedKycUrl('user-123/cnic.jpg');

      expect(mockStorageFrom).toHaveBeenCalledWith(KYC_BUCKET);
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        'user-123/cnic.jpg',
        DEFAULT_SIGNED_URL_EXPIRY_SECONDS
      );
      expect(url).toBe('https://test-signed-url.com/kyc');
    });

    it('wraps storage permission errors into PermissionDeniedError', async () => {
      const mockCreateSignedUrl = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'permission denied', code: '42501' },
      });

      mockStorageFrom.mockReturnValue({
        createSignedUrl: mockCreateSignedUrl,
      });

      await expect(createSignedKycUrl('user-123/cnic.jpg')).rejects.toThrow(
        PermissionDeniedError
      );
    });
  });

  describe('uploadKycDocument', () => {
    it('throws ValidationError if userId or fileName is missing', async () => {
      await expect(uploadKycDocument('', 'cnic.jpg', 'fake-bytes')).rejects.toThrow(
        ValidationError
      );
      await expect(uploadKycDocument('user-123', '', 'fake-bytes')).rejects.toThrow(
        ValidationError
      );
    });

    it('uploads to kyc-documents/{userId}/{sanitizedFileName} and returns signedUrl', async () => {
      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockCreateSignedUrl = jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://test-signed-url.com/kyc' },
        error: null,
      });

      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
      });

      const res = await uploadKycDocument('user-123', 'my cnic#1.png', 'fake-bytes');

      expect(mockStorageFrom).toHaveBeenCalledWith(KYC_BUCKET);
      expect(mockUpload).toHaveBeenCalledWith(
        'user-123/my_cnic_1.png',
        'fake-bytes',
        expect.objectContaining({ upsert: true })
      );
      expect(res.path).toBe('user-123/my_cnic_1.png');
      expect(res.signedUrl).toBe('https://test-signed-url.com/kyc');
    });
  });

  describe('listUserKycDocuments', () => {
    it('throws ValidationError if userId is missing', async () => {
      await expect(listUserKycDocuments('')).rejects.toThrow(ValidationError);
    });

    it('returns document listing', async () => {
      const mockList = jest.fn().mockResolvedValue({
        data: [{ name: 'cnic_front.jpg', id: 'doc-1' }],
        error: null,
      });

      mockStorageFrom.mockReturnValue({
        list: mockList,
      });

      const docs = await listUserKycDocuments('user-123');

      expect(mockStorageFrom).toHaveBeenCalledWith(KYC_BUCKET);
      expect(mockList).toHaveBeenCalledWith('user-123', expect.any(Object));
      expect(docs).toHaveLength(1);
    });
  });
});
