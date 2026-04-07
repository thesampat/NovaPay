import { BadRequestException, Controller, Get } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';
import type { IPayrollBulk } from './payroll.types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return 'Helo - From - Payroll'
  }

  @MessagePattern('run_payroll')
  async processPayroll(body: IPayrollBulk) {
    if (!body.sender || !body.paylist) throw new BadRequestException();
    return this.appService.processPayroll(body);
  }

  @MessagePattern('get_status')
  async getStatus(data: { batchId: string }) {
    return this.appService.getStatus(data);
  }
}
