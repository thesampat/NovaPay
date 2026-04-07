import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @MessagePattern('create_user')
  createUser(data: any) {
    return this.appService.createUser(data);
  }

  @MessagePattern('get_user')
  getUserById(data: { userId: number }) {
    try {
      return this.appService.getUserWithDecryption(data?.userId)
    } catch (error) {

      return error
    }
  }

  @MessagePattern('update_balance')
  updateBalance(data: { userId: number, amount: number, type: 'debit' | 'credit', transaction_id: string }) {
    try {
      return this.appService.updateBalance(data)
    } catch (error) {
      return error
    }
  }

  @MessagePattern('get_currency')
  getCurrency(data: { sender: number, receiver: number }) {
    try {
      return this.appService.getCurrency(data.sender, data.receiver)
    } catch (error) {
      return error
    }
  }

  // @MessagePattern('get_all_users')
  // getAllUser() {
  //   try {
  //     return this.appService.getAllUsers()
  //   } catch (error) {
  //     return error
  //   }
  // }
}
