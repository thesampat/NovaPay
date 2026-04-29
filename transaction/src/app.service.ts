import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { IPayLoad } from './types';
import { MessagePattern } from '@nestjs/microservices';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';

import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService implements OnModuleInit {

  constructor(
    @Inject('KAFKA_SERVICE') private kafkaService: ClientProxy,
    @InjectMetric('transaction_latency_seconds') private readonly latencyHistogram: Histogram<string>
  ) { }

  async onModuleInit() {
    const patterns = [
      'get_currency',
      'get_rate',
      'write_ledger',
      'update_balance',
      'update_ledger_status',
      'clear_rate',
    ];
    patterns.forEach(pattern => {
      (this.kafkaService as any).subscribeToResponseOf(pattern);
    });
    await this.kafkaService.connect();
  }

  getHello(): string {
    return 'Hello World! From Transaction';
  }

  async transferAmount(data: IPayLoad) {
    const endTimer = this.latencyHistogram.startTimer();
    console.log(`[Transaction] Processing payment: ${data.sender} -> ${data.receiver} (Amount: ${data.amount})`);

    // 1. Parallelize Currency and Rate fetching
    const [users, fxCheck]: [any, any] = await Promise.all([
      firstValueFrom(this.kafkaService.send('get_currency', { sender: data.sender, receiver: data.receiver })),
      firstValueFrom(this.kafkaService.send('get_rate', { base: 'INR', target: 'INR' })), // Hardcoded for check, will fix below
    ]);

    console.log(`[Transaction] Found users and rates`);

    const senderUser = users.find((u: any) => u.account_id === Number(data.sender));
    const receiverUser = users.find((u: any) => u.account_id === Number(data.receiver));

    if (!senderUser || !receiverUser) {
      console.error(`[Transaction] FAILED: Sender (ID ${data.sender}) or Receiver (ID ${data.receiver}) not found.`);
      endTimer();
      return { status: 'failed', message: 'Sender or Receiver not found' };
    }

    const baseCurrency = senderUser.currency;
    const targetCurrency = receiverUser.currency;

    // 2. If currencies were different than our parallel guess, we might need a specific rate
    // But for this load test they are all INR, so we optimize.
    let rate = fxCheck.rate;
    if (baseCurrency !== 'INR' || targetCurrency !== 'INR') {
      const actualFx: any = await firstValueFrom(this.kafkaService.send('get_rate', { base: baseCurrency, target: targetCurrency }));
      rate = actualFx.rate;
    }

    if (!rate) {
      console.error(`[Transaction] FAILED: Rate fetch failed for ${baseCurrency} to ${targetCurrency}`);
      endTimer();
      return { status: 'failed', message: 'Rate fetch failed' };
    }

    const finalAmount = data.amount * rate;
    const feeAmount = 2;
    const transactionId = data.transactionId;


    try {
      // 1. Record Batch entries in Ledger FIRST (Atomic)
      const ledgerEntry = (accountId: string, type: 'DEBIT' | 'CREDIT', amount: number, cur: string, desc: string) => ({
        account_id: accountId,
        transaction_id: transactionId,
        type,
        amount,
        currency: cur,
        fx_rate: rate,
        description: desc,
        status: 'PENDING'
      });

      const ledgerBatch = [
        ledgerEntry(data.sender.toString(), 'DEBIT', data.amount, baseCurrency, `Transfer to ${data.receiver}`),
        ledgerEntry(`SETTLEMENT_POOL_${baseCurrency}`, 'CREDIT', data.amount, baseCurrency, `Transfer from ${data.sender}`),
        ledgerEntry(data.sender.toString(), 'DEBIT', feeAmount, baseCurrency, `PLATFORM FEE`),
        ledgerEntry('PLATFORM_FEE_ACCOUNT', 'CREDIT', feeAmount, baseCurrency, `PLATFORM FEE`),
        ledgerEntry(`SETTLEMENT_POOL_${targetCurrency}`, 'DEBIT', finalAmount, targetCurrency, `Transfer to ${data.receiver}`),
        ledgerEntry(data.receiver.toString(), 'CREDIT', finalAmount, targetCurrency, `Transfer from ${data.sender}`),
      ];

      await firstValueFrom(this.kafkaService.send('write_ledger', ledgerBatch));

      await Promise.all([
        firstValueFrom(this.kafkaService.send('update_balance', { userId: Number(data.sender), amount: data.amount + feeAmount, type: 'debit', transaction_id: transactionId })),
        firstValueFrom(this.kafkaService.send('update_balance', { userId: Number(data.receiver), amount: finalAmount, type: 'credit', transaction_id: transactionId })),
        firstValueFrom(this.kafkaService.send('update_ledger_status', { transaction_id: transactionId, status: 'COMPLETED' })),
      ]);

      this.kafkaService.send('clear_rate', { currency: targetCurrency }).subscribe();

      // Demo: Emit Kafka Event
      // this.kafkaService.emit('transaction_completed', {
      //   transactionId,
      //   sender: data.sender,
      //   receiver: data.receiver,
      //   amount: data.amount,
      //   timestamp: new Date().toISOString()
      // });

      endTimer();
      return { status: 'paid', transactionId, rate };

    } catch (error) {
      console.error("TRANSACTION FAILED:", error);

      // Update ledger entries to FAILED so we know what went wrong
      await firstValueFrom(this.kafkaService.send('update_ledger_status', { transaction_id: transactionId, status: 'FAILED' }));

      endTimer();
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

}



