import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AppService } from '../src/app.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('REDIS_CLIENT')
      .useValue({
        set: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should return "Hello - From - Fx"', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect("Hello - From - Fx");
  });

  afterEach(async () => {
    await app.close();
  });
});



