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

  public fxCache: any = global.fxCache || (global.fxCache = {});


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

  async getFxRate(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<number> {

    const rateKey = `${baseCurrency}_${targetCurrency}`;
    const cached = this.fxCache[rateKey];

    if (cached && Date.now() - cached.timestamp > 30000) {
      console.log(`Using cached FX rate for ${rateKey}`);
      return cached.rate;
    }


    const rate = cached?.rate || 0 + 1

    this.fxCache[rateKey] = {
      rate,
      timestamp: Date.now()
    };

    return rate;
  }

  private async flushBatch(ledgerBatch: any[], balanceUpdates: any[]) {
    // Run both in parallel → faster
    await Promise.all([
      firstValueFrom(this.kafkaService.send('write_ledger', ledgerBatch)),
      firstValueFrom(this.kafkaService.send('update_balance', balanceUpdates))
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

    if (!users) {
      // || !fxCheck?.rate ignoring fxCheck rate as of now
      endTimer();
      throw new Error("User fetch or FX rate failed");
    }

    const userMap = new Map(users.map((u: any) => [u.account_id, u]));


    let ledgerBatch: any[] = [];
    let balanceUpdates: any[] = [];
    let statusBatch: string[] = [];

    // since same txId → push once
    statusBatch.push(transactionId);

    const ledgerEntry = (
      accountId: string,
      type: 'DEBIT' | 'CREDIT',
      amount: number,
      currency: string,
      desc: string,
      rate,
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

        // SAME currency transfer
        const rate = await this.getFxRate(
          'INR',
          "INR"
        );


        // Fetch FX rate only if currencies differ


        const feeAmount = 2;

        // Converted amount
        const finalAmount = Number((data.amount * rate).toFixed(2));

        // Ledger entries
        ledgerBatch.push(

          // Sender debit
          ledgerEntry(
            sender.toString(),
            'DEBIT',
            data.amount,
            baseCurrency,
            `To ${data.receiver}`,
            rate,
          ),

          // Settlement pool receives sender currency
          ledgerEntry(
            `SETTLEMENT_POOL_${baseCurrency}`,
            'CREDIT',
            data.amount,
            baseCurrency,
            `From ${sender}`,
            rate
          ),

          // Platform fee
          ledgerEntry(
            sender.toString(),
            'DEBIT',
            feeAmount,
            baseCurrency,
            `Fee`,
            rate
          ),

          ledgerEntry(
            'PLATFORM_FEE_ACCOUNT',
            'CREDIT',
            feeAmount,
            baseCurrency,
            `Fee`,
            rate
          ),

          // Settlement pool converts and sends target currency
          ledgerEntry(
            `SETTLEMENT_POOL_${targetCurrency}`,
            'DEBIT',
            finalAmount,
            targetCurrency,
            `FX ${rate} To ${data.receiver}`,
            rate
          ),

          // Receiver gets converted amount
          ledgerEntry(
            data.receiver.toString(),
            'CREDIT',
            finalAmount,
            targetCurrency,
            `From ${sender} FX ${rate}`,
            rate
          )
        );

        // Balance updates
        balanceUpdates.push(
          {
            userId: Number(sender),
            amount: data.amount + feeAmount,
            type: 'debit',
            transaction_id: transactionId
          },
          {
            userId: Number(data.receiver),
            amount: finalAmount,
            type: 'credit',
            transaction_id: transactionId
          }
        );
      }

      await this.flushBatch(ledgerBatch, balanceUpdates);

      // 7. Bulk status update(ONLY after success)

      await firstValueFrom(
        this.kafkaService.send('update_ledger_status', {
          transaction_ids: [...new Set(statusBatch)],
          status: 'COMPLETED'
        })
      );

      this.kafkaService.emit('clear_rate', {}).subscribe();

      endTimer();

      return { status: 'paid', transactionId };

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



