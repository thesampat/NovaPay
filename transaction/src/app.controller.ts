import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import * as types from './types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get()
  transferAmount(@Query() query: types.IPayLoad) {
    try {
      return this.appService.transferAmount(query)
    } catch (error) {
      throw error
    }
  }
}
