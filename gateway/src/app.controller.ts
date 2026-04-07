import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { CheckBalanceDtoTs, PayDtoTs } from 'dto/check-balance.dto.ts/check-balance.dto.ts';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('wallet/balance')
  getBalance(@Query() data: CheckBalanceDtoTs) {
    return this.appService.getBalance(data);
  }

  @Post('user')
  createUser(@Body() data: any) {
    return this.appService.createUser(data);
  }

  @Post('pay')
  pay(@Body() data: PayDtoTs) {
    return this.appService.pay(data);
  }

  @Post('payroll/process')
  payroll(@Body() data: any) {
    return this.appService.processPayroll(data);
  }

  @Get('payroll/status/:id')
  getPayrollStatus(@Param('id') id: string) {
    return this.appService.getPayrollStatus(id);
  }
}

