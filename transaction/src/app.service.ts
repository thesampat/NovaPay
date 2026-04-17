import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { IPayLoad } from './types';
import { MessagePattern } from '@nestjs/microservices';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AppService implements OnModuleInit {

  constructor(
    @Inject('KAFKA_SERVICE') private kafkaService: ClientProxy
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
    console.log(`[Transaction] Processing payment: ${data.sender} -> ${data.receiver} (Amount: ${data.amount})`);

    const users: any = await this.kafkaService.send('get_currency', { sender: data.sender, receiver: data.receiver }).toPromise();
    console.log(`[Transaction] Found users:`, users);

    const senderUser = users.find((u: any) => u.account_id === Number(data.sender));
    const receiverUser = users.find((u: any) => u.account_id === Number(data.receiver));

    console.log(`[Transaction] Sender: ${!!senderUser}, Receiver: ${!!receiverUser}`);

    if (!senderUser || !receiverUser) {
      console.error(`[Transaction] FAILED: Sender (ID ${data.sender}) or Receiver (ID ${data.receiver}) not found.`);
      return { status: 'failed', message: 'Sender or Receiver not found' };
    }

    const baseCurrency = senderUser.currency;
    const targetCurrency = receiverUser.currency;
    const fxCheck: any = await this.kafkaService.send('get_rate', { base: baseCurrency, target: targetCurrency }).toPromise();

    if (!fxCheck || !fxCheck.rate) {
      console.error(`[Transaction] FAILED: Rate fetch failed for ${baseCurrency} to ${targetCurrency}`);
      return { status: 'failed', message: 'Rate fetch failed' };
    }

    const { rate } = fxCheck;
    const finalAmount = data.amount * rate;
    const feeAmount = 2; // Flat fee
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

      await this.kafkaService.send('write_ledger', ledgerBatch).toPromise();
      console.log(`[Transaction] Ledger batch written for ${data.transactionId}`);

      await this.kafkaService.send('update_balance', { userId: Number(data.sender), amount: data.amount + feeAmount, type: 'debit', transaction_id: transactionId }).toPromise();
      console.log(`[Transaction] Sender balance updated`);

      await this.kafkaService.send('update_balance', { userId: Number(data.receiver), amount: finalAmount, type: 'credit', transaction_id: transactionId }).toPromise();
      console.log(`[Transaction] Receiver balance updated`);

      await this.kafkaService.send('update_ledger_status', { transaction_id: transactionId, status: 'COMPLETED' }).toPromise();
      console.log(`[Transaction] Ledger status updated to COMPLETED`);

      this.kafkaService.send('clear_rate', { currency: targetCurrency }).subscribe();

      // Demo: Emit Kafka Event
      // this.kafkaService.emit('transaction_completed', {
      //   transactionId,
      //   sender: data.sender,
      //   receiver: data.receiver,
      //   amount: data.amount,
      //   timestamp: new Date().toISOString()
      // });

      return { status: 'paid', transactionId, rate };

    } catch (error) {
      console.error("TRANSACTION FAILED:", error);

      // Update ledger entries to FAILED so we know what went wrong
      await this.kafkaService.send('update_ledger_status', { transaction_id: transactionId, status: 'FAILED' }).toPromise();

      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

}



