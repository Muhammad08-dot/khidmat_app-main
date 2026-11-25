import { deleteUserAccountFlow, purgeUserStorageFiles, USER_MEDIA_BUCKETS } from '../accountDeletion';
import { supabase } from '../client';

jest.mock('../client', () => {
  const mockList = jest.fn();
  const mockRemove = jest.fn();
  const mockRpc = jest.fn();
  const mockInvoke = jest.fn();

  return {
    supabase: {
      storage: {
        from: jest.fn(() => ({
          list: mockList,
          remove: mockRemove,
        })),
      },
      rpc: mockRpc,
      functions: {
        invoke: mockInvoke,
      },
    },
  };
});

describe('Account Deletion Service (P3-3)', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('purges user files across kyc-documents, avatars, and job_media via Storage API', async () => {
    const storageFrom = supabase.storage.from as jest.Mock;
    const listMock = jest
      .fn()
      .mockResolvedValueOnce({ data: [{ name: 'cnic_front.jpg' }], error: null })
      .mockResolvedValueOnce({ data: [{ name: 'avatar.jpg' }], error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    const removeMock = jest.fn().mockResolvedValue({ data: [], error: null });

    storageFrom.mockImplementation(() => ({
      list: listMock,
      remove: removeMock,
    }));

    const removed = await purgeUserStorageFiles(userId);

    expect(removed).toBe(2);
    expect(storageFrom).toHaveBeenCalledTimes(5);
    expect(storageFrom).toHaveBeenCalledWith('kyc-documents');
    expect(storageFrom).toHaveBeenCalledWith('avatars');
    expect(storageFrom).toHaveBeenCalledWith('job_media');
    expect(removeMock).toHaveBeenCalledWith([`${userId}/cnic_front.jpg`]);
    expect(removeMock).toHaveBeenCalledWith([`${userId}/avatar.jpg`]);
  });

  it('runs storage purge, delete_user_account RPC, and delete-account edge function in sequence', async () => {
    const storageFrom = supabase.storage.from as jest.Mock;
    storageFrom.mockImplementation(() => ({
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
      remove: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));
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
      body: { userId },
    });
  });

  it('throws if userId is empty', async () => {
    await expect(deleteUserAccountFlow('')).rejects.toThrow('userId is required');
  });
});
