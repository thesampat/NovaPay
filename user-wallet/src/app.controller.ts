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
  async createUser(data: any) {
    return this.appService.createUser(data);
  }

  @MessagePattern('get_balance')
  async getBalance(data: { userId: number }) {
    const user = await this.appService.getUserById(data.userId);
    return { balance: user ? user.balance : 0 };
  }

  @MessagePattern('get_user')
  async getUserById(data: { userId: number }) {
    return this.appService.getUserWithDecryption(data?.userId);
  }

  @MessagePattern('update_balance')
  async updateBalance(data: { userId: number, amount: number, type: 'debit' | 'credit', transaction_id: string }) {
    return this.appService.updateBalance(data);
  }

  @MessagePattern('check_transaction')
  async checkTransaction(data: { userId: number, transactionId: string }) {
    return this.appService.checkTransaction(data.userId, data.transactionId);
  }

  @MessagePattern('get_currency')
  async getCurrency(data: { sender: number, receiver: number }) {
    return this.appService.getCurrency(data.sender, data.receiver);
  }
}
