import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { of } from 'rxjs';

describe('AppService (Transaction)', () => {
  let appService: AppService;

  // Mock ClientProxy instances for all upstream microservices
  const mockUserWalletService = { send: jest.fn() };
  const mockLedgerService = { send: jest.fn() };
  const mockFxService = { send: jest.fn() };

  beforeEach(async () => {
    mockUserWalletService.send.mockReset();
    mockLedgerService.send.mockReset();
    mockFxService.send.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: 'USER_WALLET_SERVICE', useValue: mockUserWalletService },
        { provide: 'LEDGER_SERVICE', useValue: mockLedgerService },
        { provide: 'FX_SERVICE', useValue: mockFxService },
      ],
    }).compile();

    appService = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(appService).toBeDefined();
  });

  describe('transferAmount', () => {
    const basePayload = {
      sender: 101,
      receiver: 202,
      amount: 100,
      transactionId: 'tx-abc-001',
    };

    const setupHappyPath = () => {
      mockUserWalletService.send.mockImplementation((pattern: string) => {
        if (pattern === 'get_currency') {
          return of([
            { account_id: 101, currency: 'USD' },
            { account_id: 202, currency: 'GBP' },
          ]);
        }
        return of({ status: 'success' });
      });

      mockFxService.send.mockImplementation((pattern: string) => {
        if (pattern === 'get_rate') return of({ rate: 0.79 });

        return of({ status: 'cleared' });
      });


      mockLedgerService.send.mockReturnValue(of({ status: 'success', hash: 'abc123' }));
    };

    it('should complete a full cross-currency transfer and return success', async () => {
      setupHappyPath();

      const result = await appService.transferAmount(basePayload as any);

      expect(result).toEqual({
        status: 'paid',
        transactionId: 'tx-abc-001',
        rate: 0.79,
      });
    });

    it('should write 6 PENDING ledger entries before touching wallets', async () => {
      setupHappyPath();
      const ledgerSendCalls: string[] = [];

      mockLedgerService.send.mockImplementation((pattern: string, data: any) => {
        ledgerSendCalls.push(`${pattern}:${data.status}`);
        return of({ status: 'success', hash: 'abc' });
      });

      await appService.transferAmount(basePayload as any);

      const pendingWrites = ledgerSendCalls.filter(c => c === 'write_ledger:PENDING');
      expect(pendingWrites).toHaveLength(6);
    });

    it('should debit sender with amount + flat fee (2) and credit receiver with converted amount', async () => {
      setupHappyPath();

      await appService.transferAmount(basePayload as any);

      // rate=0.79 so receiverAmount = 100 * 0.79 = 79
      expect(mockUserWalletService.send).toHaveBeenCalledWith('update_balance', {
        userId: 101,
        amount: 102, // 100 + 2 (fee)
        type: 'debit',
        transaction_id: 'tx-abc-001',
      });
      expect(mockUserWalletService.send).toHaveBeenCalledWith('update_balance', {
        userId: 202,
        amount: 79, // 100 * 0.79
        type: 'credit',
        transaction_id: 'tx-abc-001',
      });
    });

    it('should update ledger status to COMPLETED on success', async () => {
      setupHappyPath();

      await appService.transferAmount(basePayload as any);

      expect(mockLedgerService.send).toHaveBeenCalledWith('update_ledger_status', {
        transaction_id: 'tx-abc-001',
        status: 'COMPLETED',
      });
    });

    it('should throw an error if sender or receiver user is not found', async () => {
      // Return only ONE user, so the other is not found
      mockUserWalletService.send.mockReturnValue(of([{ account_id: 101, currency: 'USD' }]));

      await expect(appService.transferAmount(basePayload as any)).rejects.toThrow(
        'Sender or Receiver not found'
      );
    });

    it('should throw an error if the FX rate fetch fails', async () => {
      mockUserWalletService.send.mockReturnValue(
        of([
          { account_id: 101, currency: 'USD' },
          { account_id: 202, currency: 'GBP' },
        ])
      );
      // FX service returns empty / no rate
      mockFxService.send.mockReturnValue(of(null));

      await expect(appService.transferAmount(basePayload as any)).rejects.toThrow(
        'Rate fetch failed'
      );
    });

    it('should update ledger to FAILED and rethrow if wallet debit fails', async () => {
      // Users & FX succeed
      mockUserWalletService.send.mockImplementation((pattern: string) => {
        if (pattern === 'get_currency') {
          return of([
            { account_id: 101, currency: 'USD' },
            { account_id: 202, currency: 'GBP' },
          ]);
        }
        // Debit/credit failures
        throw new Error('Wallet debit failed');
      });

      mockFxService.send.mockReturnValue(of({ rate: 0.79 }));
      mockLedgerService.send.mockReturnValue(of({ status: 'success', hash: 'abc' }));

      await expect(appService.transferAmount(basePayload as any)).rejects.toThrow(
        'Transaction failed: Wallet debit failed'
      );

      // Verify rollback: ledger status must be set to FAILED
      expect(mockLedgerService.send).toHaveBeenCalledWith('update_ledger_status', {
        transaction_id: 'tx-abc-001',
        status: 'FAILED',
      });
    });
  });
});
