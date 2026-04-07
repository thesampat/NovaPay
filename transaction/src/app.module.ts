import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_WALLET_SERVICE',
        transport: Transport.TCP,
        options: { host: process.env.SERVICE_NAME ? 'user-wallet' : '127.0.0.1', port: 3001 },
      },
      {
        name: 'LEDGER_SERVICE',
        transport: Transport.TCP,
        options: { host: process.env.SERVICE_NAME ? 'ledger' : '127.0.0.1', port: 3003 },
      },
      {
        name: 'FX_SERVICE',
        transport: Transport.TCP,
        options: { host: process.env.SERVICE_NAME ? 'fx' : '127.0.0.1', port: 3004 },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
