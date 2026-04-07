import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return "Hello - From - Fx"
  }

  @MessagePattern('get_rate')
  async getRate(data: { base: string, target: string }) {
    return this.appService.getRate(data.base, data.target);
  }

  @MessagePattern('clear_rate')
  async clearRate(data: { currency: string }) {
    return this.appService.clearRate(data.currency);
  }
}

