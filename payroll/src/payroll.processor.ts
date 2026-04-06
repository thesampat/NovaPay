import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Processor('payroll')
export class PayrollProcessor extends WorkerHost {
    constructor(@Inject('TRANSACTION_SERVICE') private transactionService: ClientProxy) { super(); }
    private readonly logger = new Logger(PayrollProcessor.name);

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log(`Processing job ${job.id} for ${job.data.receiver}...`);
        this.transactionService.send('transfer_amount', job.data).subscribe();
        return { status: 'completed' };
    }
}
