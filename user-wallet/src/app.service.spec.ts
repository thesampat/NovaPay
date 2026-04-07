import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { EncryptionService } from './encryption.service';
import { UserModel } from './user.schema';

jest.mock('./user.schema', () => {
  const mockSaveFn = jest.fn().mockResolvedValue(true);
  const mockConstructor: any = jest.fn().mockImplementation(() => ({
    save: mockSaveFn,
  }));
  
  mockConstructor.findOne = jest.fn();
  mockConstructor.updateOne = jest.fn();
  mockConstructor.find = jest.fn();
  mockConstructor.mockSave = mockSaveFn;
  
  return {
    UserModel: mockConstructor,
  };
});

// Creates a mock object for Instances of UserModel (for new UserModel().save())
const mockSave = (UserModel as any).mockSave;

describe('AppService (User Wallet)', () => {
  let appService: AppService;
  let encryptionService: EncryptionService;

  beforeEach(async () => {
    // Create clear mock behaviors for the EncryptionService
    const mockEncryptionService = {
      encrypt: jest.fn().mockImplementation((val) => `ENCRYPTED_${val}`),
      decrypt: jest.fn().mockImplementation((val) => val.replace('ENCRYPTED_', '')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    appService = module.get<AppService>(AppService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(appService).toBeDefined();
  });

  describe('createUser', () => {
    it('should cleanly encrypt PII data at the field level and save the model', async () => {
      const userData = {
        account_id: 99,
        balance: 500,
        currency: 'USD',
        name: 'Sam',
        age: '28',
        gender: 'male',
      };

      const result = await appService.createUser(userData);

      // Verify the constructor was called with ENCRYPTED versions of PII
      expect(UserModel).toHaveBeenCalledWith({
        account_id: 99,
        balance: 500,
        currency: 'USD',
        name: 'ENCRYPTED_Sam',
        age: 'ENCRYPTED_28',
        gender: 'ENCRYPTED_male',
      });

      // Verify saving logic fired and returns correctly
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual({ status: 'success', account_id: 99 });
    });
  });

  describe('getUserWithDecryption', () => {
    it('should return null if user does not exist', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await appService.getUserWithDecryption(99);
      expect(result).toBeNull();
    });

    it('should find user, decrypt PII fields, and return clean data', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue({
        account_id: 99,
        balance: 500,
        currency: 'USD',
        name: 'ENCRYPTED_Sam',
        age: 'ENCRYPTED_28',
        gender: 'ENCRYPTED_male',
      });

      const result = await appService.getUserWithDecryption(99);

      // Verify we automatically decoupled the API payload from the database payload
      expect(result).toEqual({
        account_id: 99,
        balance: 500,
        currency: 'USD',
        name: 'Sam',
        age: '28',
        gender: 'male',
      });
      expect(encryptionService.decrypt).toHaveBeenCalledTimes(3);
    });
  });

  describe('updateBalance (Idempotency and Concurrency)', () => {
    beforeEach(() => {
      // Mock that the user exists by default for these tests
      (UserModel.findOne as jest.Mock).mockResolvedValue({ account_id: 101, balance: 1000 });
    });

    it('should throw Error if user is not found', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        appService.updateBalance({ userId: 101, amount: 50, type: 'debit', transaction_id: 'tx-1' })
      ).rejects.toThrow('User not found');
    });

    describe('Debit', () => {
      it('should decrement balance safely checking idempotency and sufficient funds', async () => {
        (UserModel.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

        const result = await appService.updateBalance({ userId: 101, amount: 50, type: 'debit', transaction_id: 'tx-1' });

        expect(UserModel.updateOne).toHaveBeenCalledWith(
          {
            account_id: 101,
            balance: { $gte: 50 }, // ensures they don't drop below 0
            processed_transactions: { $ne: 'tx-1' }, // ensures transaction isn't played twice
          },
          {
            $inc: { balance: -50 },
            $push: { processed_transactions: 'tx-1' },
          }
        );
        expect(result).toEqual({ status: 'success' });
      });

      it('should throw an error if already processed or insufficient funds', async () => {
        (UserModel.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 0 }); // simulate blocked update

        await expect(
          appService.updateBalance({ userId: 101, amount: 50, type: 'debit', transaction_id: 'tx-1' })
        ).rejects.toThrow('Insufficient balance or transaction already processed');
      });
    });

    describe('Credit', () => {
      it('should increment balance cleanly and log transaction', async () => {
        (UserModel.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

        const result = await appService.updateBalance({ userId: 101, amount: 50, type: 'credit', transaction_id: 'tx-1' });

        expect(UserModel.updateOne).toHaveBeenCalledWith(
          {
            account_id: 101,
            processed_transactions: { $ne: 'tx-1' },
          },
          {
            $inc: { balance: 50 },
            $push: { processed_transactions: 'tx-1' },
          }
        );
        expect(result).toEqual({ status: 'success' });
      });

      it('should swallow duplicates gracefully without exploding', async () => {
        (UserModel.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 0 }); // simulate already processed

        const result = await appService.updateBalance({ userId: 101, amount: 50, type: 'credit', transaction_id: 'tx-1' });

        expect(result).toEqual({ status: 'success', message: 'Already credited' });
      });
    });
  });

  describe('getCurrency', () => {
    it('should find users currencies by an array of sender and receivers', async () => {
      (UserModel.find as jest.Mock).mockResolvedValue([{ account_id: 101, currency: 'USD' }, { account_id: 202, currency: 'GBP' }]);

      const result = await appService.getCurrency(101, 202);

      expect(UserModel.find).toHaveBeenCalledWith(
        { account_id: { $in: [101, 202] } },
        { currency: 1, account_id: 1, _id: 0 }
      );
      expect(result.length).toBe(2);
    });
  });
});
