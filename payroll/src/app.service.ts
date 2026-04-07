import { Inject, Injectable } from '@nestjs/common';
import * as payRollTypes from './payroll.types'
import { Queue, FlowProducer } from 'bullmq';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import { InjectQueue, InjectFlowProducer } from '@nestjs/bullmq';





@Injectable()
export class AppService {
  constructor(
    @InjectQueue('payroll') private myQueue: Queue,
    @InjectFlowProducer('payroll-flow') private flowProducer: FlowProducer,
    @Inject('USER_WALLET_SERVICE') private userWalletClient: ClientProxy
  ) { }


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

    await this.flowProducer.add({
      name: 'payroll-batch-complete',
      queueName: 'payroll',
      data: { batchId: data.transactionId, sender: data.sender },
      opts: { jobId: data.transactionId },
      children: data.paylist.map(pay => ({
        name: 'payroll',
        queueName: 'payroll',
        data: {
          sender: data.sender,
          receiver: pay.receiver,
          amount: pay.amount,
          transactionId: `${data.transactionId}_${pay.receiver}`
        },
        opts: { jobId: `${data.transactionId}_${pay.receiver}` }
      }))
    });

    return { status: 'queued', batchId: data.transactionId };
  }

  async getStatus(data: { batchId: string }) {
    const parentJob = await this.myQueue.getJob(data.batchId);
    if (!parentJob) return { status: 'not_found' };

    const state = await parentJob.getState();
    const childrenCount = await parentJob.getDependenciesCount();

    const total = (childrenCount.processed ?? 0) + (childrenCount.unprocessed ?? 0);
    const completed = childrenCount.processed ?? 0;
    const progress = total > 0 ? (completed / total) * 100 : 0;


    return {
      status: state,
      progress: `${progress.toFixed(2)}%`,
      total,
      completed
    };
  }
}
