import { Inject, Injectable } from '@nestjs/common';
import * as payRollTypes from './payroll.types'
import { Queue } from 'bullmq';
import { ClientProxy } from '@nestjs/microservices';
import { InjectQueue } from '@nestjs/bullmq';



@Injectable()
export class AppService {
  constructor(@InjectQueue('payroll') private myQueue: Queue, @Inject('USER_WALLET_SERVICE') private userWalletClient: ClientProxy) { }

  async addJob(data: payRollTypes.ISinglePayroll) {
    await this.myQueue.add('payroll', data);
  }

  getHello(): string {
    return 'Hello World!';
  }

  async processPayroll(data: payRollTypes.IPayrollBulk) {
    let sender_balance = await this.userWalletClient.send('get_balance', { userId: data.sender }).toPromise();
    if (sender_balance.balance < data.paylist.reduce((acc, curr) => acc + curr.amount, 0)) {
      throw new Error('Insufficient balance');
    }
    for (const pay of data.paylist) {
      this.addJob({ sender: data.sender, receiver: pay.receiver, amount: pay.amount })
    }
    return { success: true, message: 'Payroll processed successfully' };
  }
}
