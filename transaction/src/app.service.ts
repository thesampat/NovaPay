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

  private async flushBatch(ledgerBatch: any[], balanceOps: Promise<any>[]) {
    // Run both in parallel → faster
    await Promise.all([
      firstValueFrom(this.kafkaService.send('write_ledger', ledgerBatch)),
      Promise.all(balanceOps)
    ]);
  }

  async transferAmount(datakafka: IPayLoad) {
    const endTimer = this.latencyHistogram.startTimer();

    const {
      sender,
      payload,
      transactionId
    }: {
      sender: number;
      transactionId: string;
      payload: { receiver: number; amount: number }[];
    } = datakafka;

    const userIds = [
      ...payload.map(p => Number(p.receiver)),
      Number(sender),
    ].filter(n => !isNaN(n));


    // 2. Fetch users + FX (parallel)
    const users = await firstValueFrom(
      this.kafkaService.send('get_currency', { users: userIds })
    );


    console.log('is all batch proceed in transaction - get_currency')

    if (!users) {
      // || !fxCheck?.rate ignoring fxCheck rate as of now
      endTimer();
      throw new Error("User fetch or FX rate failed");
    }

    const userMap = new Map(users.map((u: any) => [u.account_id, u]));

    // ⚡ For now constant (as you said)
    const rate = 1;

    let ledgerBatch: any[] = [];
    let balanceOps: Promise<any>[] = [];
    let statusBatch: string[] = [];

    // since same txId → push once
    statusBatch.push(transactionId);

    const ledgerEntry = (
      accountId: string,
      type: 'DEBIT' | 'CREDIT',
      amount: number,
      currency: string,
      desc: string
    ) => ({
      account_id: accountId,
      transaction_id: transactionId,
      type,
      amount,
      currency,
      fx_rate: rate,
      description: desc,
      status: 'PENDING'
    });

    try {
      for (const data of payload) {
        const senderUser: any = userMap.get(Number(sender));
        const receiverUser: any = userMap.get(Number(data.receiver));

        if (!senderUser || !receiverUser) {
          console.error(`User not found: ${sender} -> ${data.receiver}`);
          continue;
        }

        const baseCurrency = senderUser.currency;
        const targetCurrency = receiverUser.currency;

        const finalAmount = data.amount * rate;
        const feeAmount = 2;

        // 3. Ledger entries
        ledgerBatch.push(
          ledgerEntry(sender.toString(), 'DEBIT', data.amount, baseCurrency, `To ${data.receiver}`),
          ledgerEntry(`SETTLEMENT_POOL_${baseCurrency}`, 'CREDIT', data.amount, baseCurrency, `From ${sender}`),

          ledgerEntry(sender.toString(), 'DEBIT', feeAmount, baseCurrency, `Fee`),
          ledgerEntry('PLATFORM_FEE_ACCOUNT', 'CREDIT', feeAmount, baseCurrency, `Fee`),

          ledgerEntry(`SETTLEMENT_POOL_${targetCurrency}`, 'DEBIT', finalAmount, targetCurrency, `To ${data.receiver}`),
          ledgerEntry(data.receiver.toString(), 'CREDIT', finalAmount, targetCurrency, `From ${sender}`)
        );

        // 4. Balance ops
        balanceOps.push(
          firstValueFrom(this.kafkaService.send('update_balance', {
            userId: Number(sender),
            amount: data.amount + feeAmount,
            type: 'debit',
            transaction_id: transactionId
          })),
          firstValueFrom(this.kafkaService.send('update_balance', {
            userId: Number(data.receiver),
            amount: finalAmount,
            type: 'credit',
            transaction_id: transactionId
          }))
        );

        console.log('is all batch proceed in transaction')
        // 5. Flush batch (50)

        await this.flushBatch(ledgerBatch, balanceOps);
        ledgerBatch = [];
        balanceOps = [];

      }


      // 7. Bulk status update (ONLY after success)
      // await firstValueFrom(
      //   this.kafkaService.send('update_ledger_status', {
      //     transaction_ids: [...new Set(statusBatch)],
      //     status: 'COMPLETED'
      //   })
      // );

      // this.kafkaService.emit('clear_rate', {}).subscribe();

      endTimer();

      return { status: 'paid', transactionId, rate };

    } catch (error) {
      console.error("TRANSACTION FAILED:", error);

      await firstValueFrom(
        this.kafkaService.send('update_ledger_status', {
          transaction_ids: [...new Set(statusBatch)],
          status: 'FAILED'
        })
      );

      endTimer();
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }
}



