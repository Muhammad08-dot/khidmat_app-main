import {
  deleteUserAccountFlow,
  purgeUserStorageFiles,
  USER_PREFIX_BUCKETS,
  BOOKING_MEDIA_BUCKET,
} from '../accountDeletion';
import { supabase } from '../client';

jest.mock('../client', () => {
  const mockList = jest.fn();
  const mockRemove = jest.fn();
  const mockRpc = jest.fn();
  const mockInvoke = jest.fn();
  const mockOr = jest.fn();

  return {
    supabase: {
      storage: {
        from: jest.fn(() => ({
          list: mockList,
          remove: mockRemove,
        })),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          or: mockOr,
        })),
      })),
      rpc: mockRpc,
      functions: {
        invoke: mockInvoke,
      },
    },
  };
});

describe('Account Deletion Service (P3-3 / M2-4)', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const bookingId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('purges userId/ files from kyc-documents & avatars and bookingId/ files from job_media', async () => {
    const storageFrom = supabase.storage.from as jest.Mock;
    const listMock = jest
      .fn()
      .mockResolvedValueOnce({ data: [{ name: 'cnic_front.jpg' }], error: null })
      .mockResolvedValueOnce({ data: [{ name: 'avatar.jpg' }], error: null })
      .mockResolvedValueOnce({ data: [{ name: 'proof.jpg' }], error: null });
    const removeMock = jest.fn().mockResolvedValue({ data: [], error: null });

    storageFrom.mockImplementation(() => ({
      list: listMock,
      remove: removeMock,
    }));

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        or: jest.fn().mockResolvedValue({ data: [{ id: bookingId }], error: null }),
      }),
    });

    const removed = await purgeUserStorageFiles(userId);

    expect(removed).toBe(3);
    expect(storageFrom).toHaveBeenCalledWith(USER_PREFIX_BUCKETS[0]);
    expect(storageFrom).toHaveBeenCalledWith(USER_PREFIX_BUCKETS[1]);
    expect(storageFrom).toHaveBeenCalledWith(BOOKING_MEDIA_BUCKET);
    expect(removeMock).toHaveBeenCalledWith([`${userId}/cnic_front.jpg`]);
    expect(removeMock).toHaveBeenCalledWith([`${userId}/avatar.jpg`]);
    expect(removeMock).toHaveBeenCalledWith([`${bookingId}/proof.jpg`]);
  });

  it('runs storage purge, delete_user_account RPC, and delete-account edge function in sequence', async () => {
    const storageFrom = supabase.storage.from as jest.Mock;
    storageFrom.mockImplementation(() => ({
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
      remove: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        or: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: true, error: null });
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: { deleted: true }, error: null });

    const result = await deleteUserAccountFlow(userId);

    expect(result).toEqual({
      storageFilesRemoved: 0,
      rpcDeleted: true,
      authDeleted: true,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('delete_user_account', { p_user_id: userId });
    expect(supabase.functions.invoke).toHaveBeenCalledWith('delete-account', {
      body: {},
    });
  });

  it('throws if userId is empty', async () => {
    await expect(deleteUserAccountFlow('')).rejects.toThrow('userId is required');
  });
});
