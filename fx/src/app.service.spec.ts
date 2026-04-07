import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService (FX)', () => {
  let appService: AppService;
  let redisClientMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    redisClientMock = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: 'REDIS_CLIENT',
          useValue: redisClientMock,
        },
      ],
    }).compile();

    appService = module.get<AppService>(AppService);

    jest.spyOn(global.Date, 'now').mockImplementation(() => 1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(appService).toBeDefined();
  });

  describe('getRate', () => {
    it('should return cached rate if it exists in Redis', async () => {
      const cachedData = { rate: 85.5, base: 'USD', target: 'INR', expiry: 1060000 };
      redisClientMock.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await appService.getRate('USD', 'INR');

      expect(redisClientMock.get).toHaveBeenCalledWith('rate:INR');
      expect(result).toEqual(cachedData);
      expect(redisClientMock.set).not.toHaveBeenCalled();
    });

    it('should calculate new rate, cache it, and return it if not in Redis', async () => {
      redisClientMock.get.mockResolvedValue(null);

      jest.spyOn(appService, 'getMockRate').mockResolvedValue(83.5);

      const result = await appService.getRate('USD', 'INR');

      expect(redisClientMock.get).toHaveBeenCalledWith('rate:INR');
      expect(appService.getMockRate).toHaveBeenCalledWith('USD', 'INR');

      // Expected generated response based on the mocked Date.now
      const expectedData = {
        rate: 83.5,
        base: 'USD',
        target: 'INR',
        expiry: 1060000, // Date.now (1000000) + 60000
      };

      expect(result).toEqual(expectedData);
      expect(redisClientMock.set).toHaveBeenCalledWith(
        'rate:INR',
        JSON.stringify(expectedData),
        'EX',
        60
      );
    });
  });

  describe('clearRate', () => {
    it('should delete the cached rate from Redis and return status', async () => {
      const result = await appService.clearRate('INR');

      expect(redisClientMock.del).toHaveBeenCalledWith('rate:INR');
      expect(result).toEqual({ status: 'cleared' });
    });
  });

  describe('getMockRate', () => {
    it('should return exactly 1.0 when base and target are the same', async () => {
      const rate = await appService.getMockRate('USD', 'USD');
      expect(rate).toBe(1.0);
    });

    it('should return exactly 1.0 if an unsupported currency is provided', async () => {
      const rate = await appService.getMockRate('UNKNOWN_CRYPTO', 'USD');
      expect(rate).toBe(1.0);
    });

    it('should return a valid calculated exchange rate with minor fluctuation', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const rate = await appService.getMockRate('USD', 'GBP');
      expect(rate).toBe(0.79);
    });
  });
});
