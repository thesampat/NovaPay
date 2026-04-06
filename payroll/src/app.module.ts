import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_WALLET_SERVICE',
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: 3001 },
      },
      {
        name: 'TRANSACTION_SERVICE',
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: 3002 },
      }
    ]),
    BullModule.forRoot({
      connection: { host: '127.0.0.1', port: 6379 },
    }),
    BullModule.registerQueue({
      name: 'payroll',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
