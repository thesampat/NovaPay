import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BullModule } from '@nestjs/bullmq';
import { PrometheusModule, makeCounterProvider } from '@willsoto/nestjs-prometheus';
import { PayrollProcessor } from './payroll.processor';

@Module({
  imports: [
    PrometheusModule.register(),
    // 🏦 Redis Connection for the Manager
    BullModule.forRoot({
      connection: {
        host: 'redis',
        port: 6379,
      },
    }),
    // 📋 The Payroll Queues
    BullModule.registerQueue({
      name: 'payroll-engine',
    }),
    BullModule.registerFlowProducer({
      name: 'payroll-flow',
    }),
    // 🚀 Kafka Connection for the Courier
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'payroll',
            brokers: ['kafka:29092'],
          },
          consumer: {
            groupId: 'payroll-consumer-group',
          },
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    PayrollProcessor,
    makeCounterProvider({
      name: 'payroll_batches_total',
      help: 'Total number of payroll batches initiated',
    }),
    makeCounterProvider({
      name: 'payroll_payments_total',
      help: 'Total number of individual employee payments processed',
      labelNames: ['status'],
    }),
  ],
})
export class AppModule {}
