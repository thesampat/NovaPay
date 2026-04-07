import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { LedgerModel } from './ledger.schema';

jest.mock('./ledger.schema', () => {
  return {
    LedgerModel: {
      findOne: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
});

describe('AppService (Ledger)', () => {
  let appService: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    appService = module.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(appService).toBeDefined();
  });

  describe('writeLedger', () => {
    it('should create the first block (genesis) with 64 zeros if no previous entry exists', async () => {
      // Setup chainable mock: findOne().sort() -> returns null
      const sortMock = jest.fn().mockResolvedValue(null);
      (LedgerModel.findOne as jest.Mock).mockReturnValue({ sort: sortMock });

      (LedgerModel.create as jest.Mock).mockResolvedValue({});

      const testData = {
        account_id: 101,
        transaction_id: 'tx-123',
        type: 'CREDIT' as any,
        amount: 50,
        currency: 'USD',
        fx_rate: 1.0,
        status: 'COMPLETED' as any,
        description: ''
      };

      const result = await appService.writeLedger(testData);

      expect(sortMock).toHaveBeenCalledWith({ timestamp: -1 });

      const expectedPreviousHash = '0'.repeat(64);

      expect(LedgerModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...testData,
          previous_hash: expectedPreviousHash,
          current_hash: expect.any(String),
        })
      );

      // Verify the return format
      expect(result.status).toBe('success');
      expect(result.hash).toBeDefined();
      expect(typeof result.hash).toBe('string');
    });

    it('should correctly chain the new block using the previous_hash if a past entry exists', async () => {
      // Setup chainable mock: findOne().sort() -> returns previous transaction
      const mockPastTransaction = { current_hash: 'abc123def456' };
      const sortMock = jest.fn().mockResolvedValue(mockPastTransaction);
      (LedgerModel.findOne as jest.Mock).mockReturnValue({ sort: sortMock });

      (LedgerModel.create as jest.Mock).mockResolvedValue({});

      const testData = {
        account_id: 102,
        transaction_id: 'tx-999',
        type: 'DEBIT' as any,
        amount: 100,
        currency: 'GBP',
        fx_rate: 0.79,
        status: 'COMPLETED' as any,
        description: ''
      };

      const result = await appService.writeLedger(testData);

      expect(LedgerModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          previous_hash: 'abc123def456',
        })
      );
      expect(result.status).toBe('success');
    });

    it('should catch errors and wrap them in an error status return', async () => {
      // Simulate Database down
      (LedgerModel.findOne as jest.Mock).mockImplementation(() => {
        throw new Error('Database disconnected');
      });

      const result = await appService.writeLedger({} as any);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Database disconnected');
    });
  });

  describe('updateLedgerStatus', () => {
    it('should beautifully update multiple ledger lines status linked to one transactionId', async () => {
      (LedgerModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      const result = await appService.updateLedgerStatus({
        transaction_id: 'tx-222',
        status: 'FAILED',
      });

      expect(LedgerModel.updateMany).toHaveBeenCalledWith(
        { transaction_id: 'tx-222' },
        { $set: { status: 'FAILED' } }
      );

      expect(result).toEqual({ status: 'success' });
    });

    it('should catch validation errors during update and return them', async () => {
      (LedgerModel.updateMany as jest.Mock).mockRejectedValue(new Error('Invalid Status Enum'));

      const result = await appService.updateLedgerStatus({
        transaction_id: 'tx-222',
        status: 'UNKNOWN' as any,
      });

      expect(result).toEqual({ status: 'error', message: 'Invalid Status Enum' });
    });
  });
});
