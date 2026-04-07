import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';


describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: 'REDIS_CLIENT',
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello - From - Fx"', () => {
      expect(appController.getHello()).toBe('Hello - From - Fx');
    });
  });
});


describe('AppService (Mock Rates)', () => {
  let service: AppService;

  beforeEach(async () => {
    service = new AppService({
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    } as any)
  });

  it('should return fluctuating rates for USD to EUR', async () => {
    for (let i = 0; i < 5; i++) {
      const rate = await service.getMockRate('USD', 'EUR');
      console.log(`USD to EUR (Run ${i + 1}): ${rate}`);
      expect(rate).toBeGreaterThan(0.85);
      expect(rate).toBeLessThan(1.0);
    }
  });

  it('should return fluctuating rates for JPY to INR', async () => {
    const rate = await service.getMockRate('JPY', 'INR');
    console.log(`JPY to INR: ${rate}`);
    expect(rate).toBeDefined();
    expect(typeof rate).toBe('number');
  });
});