import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import type { IPayrollBulk } from './payroll.types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return 'Helo - From - Payroll'
  }

  @Post('payroll/process')
  async processPayroll(@Body() body: IPayrollBulk) {
    if (!body.sender || !body.paylist) throw new BadRequestException();
    return this.appService.processPayroll(body);
  }
}
