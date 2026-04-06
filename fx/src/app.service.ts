import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AppService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async createQuote(base: string, target: string) {
    const rate = await this.getMockRate(base, target);
    const quoteId = uuidv4();
    const quoteData = {
      rate,
      base,
      target,
      expiry: Date.now() + 60000,
    };

    await this.redis.set(`quote:${quoteId}`, JSON.stringify(quoteData), 'EX', 60);
    return { quoteId, ...quoteData };
  }

  async verifyQuote(quoteId: string) {
    const data = await this.redis.get(`quote:${quoteId}`);
    if (!data) return null;

    await this.redis.del(`quote:${quoteId}`);
    return JSON.parse(data);
  }

  async getMockRate(base: string, target: string): Promise<number> {
    if (base === target) return 1.0;

    const rates: Record<string, number> = {
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 151.84,
      AUD: 1.52,
      CAD: 1.35,
      CHF: 0.90,
      CNY: 7.23,
      INR: 83.30,
      SGD: 1.35,
    };

    const fluctuate = (rate: number) => rate * (1 + (Math.random() * 0.02 - 0.01));

    const rawBaseRate = rates[base.toUpperCase()];
    const rawTargetRate = rates[target.toUpperCase()];

    if (!rawBaseRate || !rawTargetRate) {
      return 1.0;
    }

    const baseRate = fluctuate(rawBaseRate);
    const targetRate = fluctuate(rawTargetRate);

    return Number(((1 / baseRate) * targetRate).toFixed(4));
  }
}
