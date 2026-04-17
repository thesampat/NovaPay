import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
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
  payroll(@Req() req: Request, @Body() data: any) {
    let idempotencyKey = req.headers['idempotency-key'];
    data.idempotencyKey = idempotencyKey;
    return this.appService.processPayroll(data);
  }

  @Get('payroll/status/:id')
  getPayrollStatus(@Param('id') id: string) {
    return this.appService.getPayrollStatus(id);
  }

  @Get('admin/users')
  getAdminUsers() {
    return this.appService.adminGetUsers();
  }

  @Get('admin/ledgers')
  getAdminLedgers() {
    return this.appService.adminGetLedgers();
  }

  @Get('admin/stats')
  getAdminStats() {
    return this.appService.adminGetStats();
  }

  @Post('admin/reset-ledger')
  resetLedger() {
    return this.appService.adminResetLedger();
  }

  @Post('admin/reset-users')
  resetUsers() {
    return this.appService.adminResetUsers();
  }

  @Post('admin/seed-users')
  seedUsers() {
    return this.appService.adminSeedUsers();
  }

  @Post('admin/run-refunds')
  runRefunds() {
    return this.appService.adminRunRefunds();
  }
}

