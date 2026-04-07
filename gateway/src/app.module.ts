import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      { name: "USER_WALLET_SERVICE", transport: Transport.TCP, options: { host: process.env.SERVICE_NAME ? 'user-wallet' : '127.0.0.1', port: 3001 } },
      { name: "TRANSACTION_SERVICE", transport: Transport.TCP, options: { host: process.env.SERVICE_NAME ? 'transaction' : '127.0.0.1', port: 3002 } },
      { name: "LEDGER_SERVICE", transport: Transport.TCP, options: { host: process.env.SERVICE_NAME ? 'ledger' : '127.0.0.1', port: 3003 } },
      { name: "FX_SERVICE", transport: Transport.TCP, options: { host: process.env.SERVICE_NAME ? 'fx' : '127.0.0.1', port: 3004 } },
      { name: 'PAYROLL_SERVICE', transport: Transport.TCP, options: { host: process.env.SERVICE_NAME ? 'payroll' : '127.0.0.1', port: 3005 } },
      { name: 'ADMIN_SERVICE', transport: Transport.TCP, options: { host: process.env.SERVICE_NAME ? 'admin' : '127.0.0.1', port: 3006 } }
    ])
  ],
  controllers: [AppController],
  providers: [AppService],

})
export class AppModule { }
