import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { ClientProxy } from '@nestjs/microservices';
import { CheckBalanceDtoTs, PayDtoTs } from 'dto/check-balance.dto.ts/check-balance.dto.ts';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
    @Inject('USER_WALLET_SERVICE') private userWalletClient: ClientProxy,
    @Inject('TRANSACTION_SERVICE') private transactionClient: ClientProxy
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('wallet/balance')
  getBalance(@Query() data: CheckBalanceDtoTs) {
    return this.userWalletClient.send('get_balance', data)
  }

  @Post('pay')
  pay(@Body() data: PayDtoTs) {
    return this.transactionClient.send('transfer_amount', data)
  }

}
