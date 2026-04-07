import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { of } from 'rxjs';

describe('AppService (Payroll)', () => {
  let appService: AppService;

  // Mock BullMQ Queue
  const mockQueue = {
    add: jest.fn(),
    getJob: jest.fn(),
  };

  // Mock BullMQ FlowProducer
  const mockFlowProducer = {
    add: jest.fn(),
  };

  // Mock user-wallet ClientProxy
  const mockUserWalletClient = { send: jest.fn() };

  beforeEach(async () => {
    mockQueue.add.mockReset();
    mockQueue.getJob.mockReset();
    mockFlowProducer.add.mockReset();
    mockUserWalletClient.send.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: 'BullQueue_payroll', useValue: mockQueue },
        { provide: 'BullFlowProducer_payroll-flow', useValue: mockFlowProducer },
        { provide: 'USER_WALLET_SERVICE', useValue: mockUserWalletClient },
      ],
    }).compile();

    appService = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(appService).toBeDefined();
  });

  describe('processPayroll', () => {
    const payrollData = {
      sender: 1,
      transactionId: 'batch-tx-001',
      paylist: [
        { receiver: 2, amount: 100 },
        { receiver: 3, amount: 200 },
      ],
    };

    it('should queue a FlowProducer batch job and return queued status when sender has sufficient funds', async () => {
      // Sender has balance of 1000 > 300 total
      mockUserWalletClient.send.mockReturnValue(of({ balance: 1000 }));
      mockFlowProducer.add.mockResolvedValue({});

      const result = await appService.processPayroll(payrollData);

      expect(mockUserWalletClient.send).toHaveBeenCalledWith('get_balance', { userId: 1 });
      expect(mockFlowProducer.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'payroll-batch-complete',
          queueName: 'payroll',
          data: { batchId: 'batch-tx-001', sender: 1 },
          opts: { jobId: 'batch-tx-001' },
        })
      );
      expect(result).toEqual({ status: 'queued', batchId: 'batch-tx-001' });
    });

    it('should create one child job per payroll entry with correct transactionIds', async () => {
      mockUserWalletClient.send.mockReturnValue(of({ balance: 1000 }));
      mockFlowProducer.add.mockResolvedValue({});

      await appService.processPayroll(payrollData);

      const flowCall = mockFlowProducer.add.mock.calls[0][0];
      expect(flowCall.children).toHaveLength(2);
      expect(flowCall.children[0]).toMatchObject({
        data: { sender: 1, receiver: 2, amount: 100, transactionId: 'batch-tx-001_2' },
        opts: { jobId: 'batch-tx-001_2' },
      });
      expect(flowCall.children[1]).toMatchObject({
        data: { sender: 1, receiver: 3, amount: 200, transactionId: 'batch-tx-001_3' },
        opts: { jobId: 'batch-tx-001_3' },
      });
    });

    it('should throw an error if sender has insufficient funds', async () => {
      // Total paylist = 300, balance = 200 → should be rejected
      mockUserWalletClient.send.mockReturnValue(of({ balance: 200 }));

      await expect(appService.processPayroll(payrollData)).rejects.toThrow('Insufficient balance');
      expect(mockFlowProducer.add).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return not_found if the parent batch job does not exist', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      const result = await appService.getStatus({ batchId: 'nonexistent-batch' });

      expect(result).toEqual({ status: 'not_found' });
    });

    it('should return status, progress, total, and completed for an in-progress batch', async () => {
      const mockJob = {
        getState: jest.fn().mockResolvedValue('active'),
        getDependenciesCount: jest.fn().mockResolvedValue({ processed: 1, unprocessed: 1 }),
      };
      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await appService.getStatus({ batchId: 'batch-tx-001' });

      expect(result).toEqual({
        status: 'active',
        progress: '50.00%',
        total: 2,
        completed: 1,
      });
    });

    it('should return 100% progress when all jobs in the batch are processed', async () => {
      const mockJob = {
        getState: jest.fn().mockResolvedValue('completed'),
        getDependenciesCount: jest.fn().mockResolvedValue({ processed: 5, unprocessed: 0 }),
      };
      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await appService.getStatus({ batchId: 'batch-tx-done' });

      expect(result).toEqual({
        status: 'completed',
        progress: '100.00%',
        total: 5,
        completed: 5,
      });
    });

    it('should handle zero-item batches without division-by-zero', async () => {
      const mockJob = {
        getState: jest.fn().mockResolvedValue('waiting'),
        getDependenciesCount: jest.fn().mockResolvedValue({ processed: 0, unprocessed: 0 }),
      };
      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await appService.getStatus({ batchId: 'batch-empty' });

      expect(result).toEqual({
        status: 'waiting',
        progress: '0.00%',
        total: 0,
        completed: 0,
      });
    });
  });
});
