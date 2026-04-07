import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BullModule } from '@nestjs/bullmq';
import { PayrollProcessor } from './payroll.processor';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_WALLET_SERVICE',
        transport: Transport.TCP,
        options: { host: process.env.SERVICE_NAME ? 'user-wallet' : '127.0.0.1', port: 3001 },
      },
      {
        name: 'TRANSACTION_SERVICE',
        transport: Transport.TCP,
        options: { host: process.env.SERVICE_NAME ? 'transaction' : '127.0.0.1', port: 3002 },
      }
    ]),
    BullModule.forRoot({
      connection: { host: process.env.SERVICE_NAME ? 'redis' : '127.0.0.1', port: 6379 },
    }),
    BullModule.registerQueue({
      name: 'payroll',
    }),
    BullModule.registerFlowProducer({
      name: 'payroll-flow',
    }),
  ],

  controllers: [AppController],
  providers: [AppService, PayrollProcessor],
})
export class AppModule { }
