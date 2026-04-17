import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import * as payRollTypes from './payroll.types'
import { ClientProxy } from '@nestjs/microservices';
import { InjectFlowProducer, InjectQueue } from '@nestjs/bullmq';
import { FlowProducer, Queue } from 'bullmq';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private kafkaService: ClientProxy,
    @InjectQueue('payroll-engine') private payrollQueue: Queue,
    @InjectFlowProducer('payroll-flow') private flowProducer: FlowProducer,
    @InjectMetric('payroll_batches_total') private readonly batchCounter: Counter<string>,
  ) { }

  async onModuleInit() {
    (this.kafkaService as any).subscribeToResponseOf('get_balance');
    (this.kafkaService as any).subscribeToResponseOf('transfer_amount');
    await this.kafkaService.connect();
  }

  async processPayroll(data: payRollTypes.IPayrollBulk) {
    const existingJob = await this.payrollQueue.getJob(`batch_${data.idempotencyKey}`);
    if (existingJob) {
      return {
        status: 'queued',
        batchId: data.idempotencyKey,
        count: data.paylist.length,
        alreadyProcessed: true
      };
    }

    const balanceInfo: any = await firstValueFrom(
      this.kafkaService.send('get_balance', { userId: data.sender })
    );

    const totalRequired = data.paylist.reduce((acc, curr) => acc + curr.amount, 0);

    if (balanceInfo.balance < totalRequired) {
      throw new Error(`Insufficient Funds. Required: ${totalRequired}, Found: ${balanceInfo.balance}`);
    }

    this.batchCounter.inc();

    await this.flowProducer.add({
      name: 'batch-complete',
      queueName: 'payroll-engine',
      data: { batchId: data.idempotencyKey, sender: data.sender },
      opts: { jobId: `batch_${data.idempotencyKey}` },
      children: (data.paylist || []).map(emp => ({
        name: 'individual-payment',
        queueName: 'payroll-engine',
        data: {
          sender: data.sender,
          receiver: emp.receiver,
          amount: emp.amount,
          transactionId: `${data.idempotencyKey}_${emp.receiver}`
        },
        opts: {
          jobId: `pay_${data.idempotencyKey}_${emp.receiver}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 }
        }
      }))
    });

    return {
      status: 'queued',
      batchId: data.idempotencyKey,
      count: data.paylist.length
    };
  }

  async getStatus(data: { batchId: string }) {
    const job = await this.payrollQueue.getJob(`batch_${data.batchId}`);
    if (!job) return { status: 'not_found' };

    const state = await job.getState();
    const deps = await job.getDependenciesCount();

    return {
      batchId: data.batchId,
      status: state,
      processed: deps.processed || 0,
      pending: deps.unprocessed || 0,
      completion: deps.unprocessed === 0 ? '100%' : 'processing'
    };
  }
}
