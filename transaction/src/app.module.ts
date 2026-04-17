import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    PrometheusModule.register(),
    ClientsModule.register([
      // {
      //   name: 'USER_WALLET_SERVICE',
      //   transport: Transport.TCP,
      //   options: { host: process.env.SERVICE_NAME ? 'user-wallet' : '127.0.0.1', port: 3001 },
      // },
      // {
      //   name: 'LEDGER_SERVICE',
      //   transport: Transport.TCP,
      //   options: { host: process.env.SERVICE_NAME ? 'ledger' : '127.0.0.1', port: 3003 },
      // },
      // {
      //   name: 'FX_SERVICE',
      //   transport: Transport.TCP,
      //   options: { host: process.env.SERVICE_NAME ? 'fx' : '127.0.0.1', port: 3004 },
      // },
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: [process.env.SERVICE_NAME ? 'kafka:29092' : 'localhost:9092'],
          },
          consumer: {
            groupId: 'transaction-client-group',
          },
        },
      }
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
