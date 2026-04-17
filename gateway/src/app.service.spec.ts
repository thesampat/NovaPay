import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { of } from 'rxjs';

// We mock the crypto module to make transaction IDs deterministic
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('deterministic-tx-id-hash'),
  })),
}));

describe('AppService (Gateway)', () => {
  let appService: AppService;

  const mockUserWalletClient = { send: jest.fn() };
  const mockTransactionClient = { send: jest.fn() };
  const mockPayrollClient = { send: jest.fn() };

  beforeEach(async () => {
    // Reset mocks before each test
    mockUserWalletClient.send.mockReset();
    mockTransactionClient.send.mockReset();
    mockPayrollClient.send.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        // { provide: 'USER_WALLET_SERVICE', useValue: mockUserWalletClient },
        // { provide: 'TRANSACTION_SERVICE', useValue: mockTransactionClient },
        // { provide: 'PAYROLL_SERVICE', useValue: mockPayrollClient },
      ],
    }).compile();

    appService = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(appService).toBeDefined();
  });

  describe('getBalance', () => {
    it('should forward the request to user-wallet microservice', () => {
      const mockObservable = of({ balance: 500 });
      mockUserWalletClient.send.mockReturnValue(mockObservable);

      const result = appService.getBalance({ userId: 101 } as any);

      expect(mockUserWalletClient.send).toHaveBeenCalledWith('get_balance', { userId: 101 });
      expect(result).toBe(mockObservable);
    });
  });

  describe('createUser', () => {
    it('should forward new user data to user-wallet microservice', () => {
      const mockObservable = of({ status: 'success', account_id: 99 });
      mockUserWalletClient.send.mockReturnValue(mockObservable);

      const userData = { account_id: 99, name: 'Sam', balance: 500, currency: 'USD' };
      const result = appService.createUser(userData);

      expect(mockUserWalletClient.send).toHaveBeenCalledWith('create_user', userData);
      expect(result).toBe(mockObservable);
    });
  });

  describe('pay', () => {
    it('should generate a deterministic transactionId and forward to transaction microservice', () => {
      const mockObservable = of({ status: 'paid' });
      mockTransactionClient.send.mockReturnValue(mockObservable);

      const payData = { sender: 101, receiver: 202, amount: 50 } as any;
      const result = appService.pay(payData);

      // The mocked crypto always returns 'deterministic-tx-id-hash'
      expect(mockTransactionClient.send).toHaveBeenCalledWith(
        'transfer_amount',
        expect.objectContaining({
          sender: 101,
          receiver: 202,
          amount: 50,
          transactionId: 'deterministic-tx-id-hash',
        })
      );
      expect(result).toBe(mockObservable);
    });

    it('should use pre-supplied transactionId if one is given (idempotency)', () => {
      const mockObservable = of({ status: 'paid' });
      mockTransactionClient.send.mockReturnValue(mockObservable);

      const payDataWithId = { sender: 101, receiver: 202, amount: 50, transactionId: 'client-supplied-id' } as any;
      appService.pay(payDataWithId);

      expect(mockTransactionClient.send).toHaveBeenCalledWith(
        'transfer_amount',
        expect.objectContaining({ transactionId: 'client-supplied-id' })
      );
    });
  });

  describe('processPayroll', () => {
    it('should generate a deterministic transactionId and queue the payroll batch', () => {
      const mockObservable = of({ status: 'queued', batchId: 'deterministic-tx-id-hash' });
      mockPayrollClient.send.mockReturnValue(mockObservable);

      const payrollData = {
        sender: 1,
        paylist: [
          { receiver: 2, amount: 100 },
          { receiver: 3, amount: 200 },
        ],
      } as any;

      const result = appService.processPayroll(payrollData);

      expect(mockPayrollClient.send).toHaveBeenCalledWith(
        'run_payroll',
        expect.objectContaining({
          sender: 1,
          transactionId: 'deterministic-tx-id-hash',
        })
      );
      expect(result).toBe(mockObservable);
    });

    it('should use pre-supplied transactionId if already present (idempotency)', () => {
      mockPayrollClient.send.mockReturnValue(of({}));

      const payrollData = {
        sender: 1,
        paylist: [{ receiver: 2, amount: 100 }],
        transactionId: 'pre-existing-id',
      } as any;
      appService.processPayroll(payrollData);

      expect(mockPayrollClient.send).toHaveBeenCalledWith(
        'run_payroll',
        expect.objectContaining({ transactionId: 'pre-existing-id' })
      );
    });
  });

  describe('getPayrollStatus', () => {
    it('should request batch status from the payroll microservice', () => {
      const mockObservable = of({ status: 'completed', progress: '100%' });
      mockPayrollClient.send.mockReturnValue(mockObservable);

      const result = appService.getPayrollStatus('batch-abc-123');

      expect(mockPayrollClient.send).toHaveBeenCalledWith('get_status', { batchId: 'batch-abc-123' });
      expect(result).toBe(mockObservable);
    });
  });
});
