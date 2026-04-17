import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { firstValueFrom } from 'rxjs';

@Processor('payroll-engine', { concurrency: 100 })
export class PayrollProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(PayrollProcessor.name);

  constructor(
    @Inject('KAFKA_SERVICE') private kafkaService: ClientProxy,
    @InjectMetric('payroll_payments_total') private readonly paymentCounter: Counter<string>,
  ) {
    super();
  }

  async onModuleInit() {
    (this.kafkaService as any).subscribeToResponseOf('transfer_amount');
    await this.kafkaService.connect();
    this.logger.log('PayrollProcessor Kafka Client connected and subscribed to transfer_amount');
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'individual-payment':
        return this.handlePayment(job);
      case 'batch-complete':
        return this.handleBatchCompletion(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return { status: 'skipped' };
    }
  }

  private async handlePayment(job: Job) {
    this.logger.log(`💸 [Job ${job.id}] Transferring ${job.data.amount} to receiver ${job.data.receiver}`);
    
    // Commands the Courier (Kafka) to coordinate with User-Wallet & Transaction Services
    try {
        const result = await firstValueFrom(
            this.kafkaService.send('transfer_amount', job.data)
        );
        
        // 🛎️ Increment Success Metric
        this.paymentCounter.inc({ status: 'success' });
        
        return result;
    } catch (err) {
        this.logger.error(`Failed to execute payment for ${job.data.receiver}: ${err.message}`);
        
        // 🛎️ Increment Failure Metric
        this.paymentCounter.inc({ status: 'failure' });
        
        throw err; // Trigger BullMQ retry
    }
  }

  private async handleBatchCompletion(job: Job) {
    this.logger.log(`🏆 [Job ${job.id}] Batch ${job.data.batchId} has been successfully distributed!`);
    
    // Optional: Emit a 'payroll.certified' event here for the Ledger
    return { status: 'completed', timestamp: new Date().toISOString() };
  }
}
