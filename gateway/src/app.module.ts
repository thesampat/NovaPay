import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrometheusModule, makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { IdempotencyInterceptor } from './idempotency.interceptor';

@Module({
  imports: [
    PrometheusModule.register(),
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: [process.env.SERVICE_NAME ? 'kafka:29092' : 'localhost:9092'],
          },
          consumer: {
            groupId: 'gateway-consumer',
          },
          producer: {
            metadataMaxAge: 3000,
          }
        },
      }
    ])
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    makeHistogramProvider({
      name: 'http_request_duration_ms',
      help: 'Duration of HTTP requests in ms',
      labelNames: ['method', 'route', 'code'],
      buckets: [0.1, 5, 15, 50, 100, 500],
    }),
  ],
})
export class AppModule { }
