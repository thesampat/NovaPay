import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Processor('payroll')
export class PayrollProcessor extends WorkerHost {
    constructor(@Inject('TRANSACTION_SERVICE') private transactionService: ClientProxy) { super(); }
    private readonly logger = new Logger(PayrollProcessor.name);

    async process(job: Job<any, any, string>): Promise<any> {
        if (job.name === 'payroll') {
            this.logger.log(`Processing payroll job ${job.id} for receiver ${job.data.receiver}...`);
            try {
                const result = await firstValueFrom(this.transactionService.send('transfer_amount', job.data));
                return result;
            } catch (error) {
                this.logger.error(`Payroll job ${job.id} failed: ${error.message}`);
                throw error;
            }
        } else if (job.name === 'payroll-batch-complete') {
            this.logger.log(`Batch ${job.data.batchId} reached completion handler.`);
            return { status: 'batch_completed' };
        }

        return { status: 'unknown_job_type' };
    }
}
