import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly redis = new Redis({
    host: 'redis',
    port: 6379,
  });

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    if (request.method !== 'POST') {
      return next.handle();
    }

    const idempotencyKey = request.headers['x-idempotency-key'];

    if (!idempotencyKey) {
      return next.handle();
    }

    const lockKey = `idempotency:${idempotencyKey}`;
    const result = await this.redis.set(lockKey, 'processing', 'EX', 300, 'NX');

    if (result !== 'OK') {
      throw new ConflictException(
        'Duplicate request detected. This operation is already being processed.',
      );
    }

    return next.handle();
  }
}
