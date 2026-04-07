import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      { name: "USER_WALLET_SERVICE", transport: Transport.TCP, options: { port: 3001 } },
      { name: "TRANSACTION_SERVICE", transport: Transport.TCP, options: { port: 3002 } },
      { name: "LEDGER_SERVICE", transport: Transport.TCP, options: { port: 3003 } },
      { name: "FX_SERVICE", transport: Transport.TCP, options: { port: 3004 } },
      { name: 'PAYROLL_SERVICE', transport: Transport.TCP, options: { port: 3005 } }
    ])
  ],
  controllers: [AppController],
  providers: [AppService],

})
export class AppModule { }
