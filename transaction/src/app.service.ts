import { Inject, Injectable } from '@nestjs/common';
import type { IPayLoad } from './types';
import { MessagePattern } from '@nestjs/microservices';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AppService {

  constructor(
    @Inject('USER_WALLET_SERVICE') private userWallerService: ClientProxy,
    @Inject('LEDGER_SERVICE') private ledgerService: ClientProxy,
    @Inject('FX_SERVICE') private fxService: ClientProxy
  ) { }

  getHello(): string {
    return 'Hello World! From Transaction';
  }

  async transferAmount(data: IPayLoad) {

    const users = await this.userWallerService.send('get_currency', { sender: data.sender, receiver: data.receiver }).toPromise();
    const senderUser = users.find((u: any) => u.account_id === Number(data.sender));
    const receiverUser = users.find((u: any) => u.account_id === Number(data.receiver));

    if (!senderUser || !receiverUser) throw new Error('Sender or Receiver not found');

    const baseCurrency = senderUser.currency;
    const targetCurrency = receiverUser.currency;
    const fxCheck = await this.fxService.send('get_rate', { base: baseCurrency, target: targetCurrency }).toPromise();

    if (!fxCheck || !fxCheck.rate) throw new Error(`Rate fetch failed`);

    const { rate } = fxCheck;
    const finalAmount = data.amount * rate;
    const feeAmount = 2; // Flat fee
    const transactionId = data.transactionId;


    try {
      // 1. Record "PENDING" entries in Ledger FIRST
      const ledgerOperations = [
        this.ledgerService.send('write_ledger', { account_id: data.sender.toString(), transaction_id: transactionId, type: 'DEBIT', amount: data.amount, currency: baseCurrency, fx_rate: rate, description: `Transfer to ${data.receiver}`, status: 'PENDING' }).toPromise(),
        this.ledgerService.send('write_ledger', { account_id: `SETTLEMENT_POOL_${baseCurrency}`, transaction_id: transactionId, type: 'CREDIT', amount: data.amount, currency: baseCurrency, fx_rate: rate, description: `Transfer from ${data.sender}`, status: 'PENDING' }).toPromise(),
        this.ledgerService.send('write_ledger', { account_id: data.sender.toString(), transaction_id: transactionId, type: 'DEBIT', amount: feeAmount, currency: baseCurrency, fx_rate: rate, description: `PLATFORM FEE`, status: 'PENDING' }).toPromise(),
        this.ledgerService.send('write_ledger', { account_id: 'PLATFORM_FEE_ACCOUNT', transaction_id: transactionId, type: 'CREDIT', amount: feeAmount, currency: baseCurrency, fx_rate: rate, description: `PLATFORM FEE`, status: 'PENDING' }).toPromise(),
        this.ledgerService.send('write_ledger', { account_id: `SETTLEMENT_POOL_${targetCurrency}`, transaction_id: transactionId, type: 'DEBIT', amount: finalAmount, currency: targetCurrency, fx_rate: rate, description: `Transfer to ${data.receiver}`, status: 'PENDING' }).toPromise(),
        this.ledgerService.send('write_ledger', { account_id: data.receiver.toString(), transaction_id: transactionId, type: 'CREDIT', amount: finalAmount, currency: targetCurrency, fx_rate: rate, description: `Transfer from ${data.sender}`, status: 'PENDING' }).toPromise(),
      ];
      await Promise.all(ledgerOperations);

      // 2. Perform Wallet Updates
      await this.userWallerService.send('update_balance', { userId: Number(data.sender), amount: data.amount + feeAmount, type: 'debit', transaction_id: transactionId }).toPromise();

      if (data?.amount === 30) {
        throw new Error('Transaction failed');
      }

      await this.userWallerService.send('update_balance', { userId: Number(data.receiver), amount: finalAmount, type: 'credit', transaction_id: transactionId }).toPromise();

      // 3. Update Ledger Status to COMPLETED
      await this.ledgerService.send('update_ledger_status', { transaction_id: transactionId, status: 'COMPLETED' }).toPromise();

      // 4. Cleanup
      this.fxService.send('clear_rate', { currency: targetCurrency }).subscribe();

      return { status: 'paid', transactionId, rate };

    } catch (error) {
      console.error("TRANSACTION FAILED:", error);

      // Update ledger entries to FAILED so we know what went wrong
      await this.ledgerService.send('update_ledger_status', { transaction_id: transactionId, status: 'FAILED' }).toPromise();

      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

}



