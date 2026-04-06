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

  @MessagePattern('transfer_amount')
  async transferAmount(data: IPayLoad) {
    const fxCheck = await this.fxService.send('verify_quote', { quoteId: data.quoteId }).toPromise();
    if (!fxCheck || !fxCheck.valid) {
      throw new Error(fxCheck?.error || 'Quote verification failed');
    }

    const { rate } = fxCheck.quote;
    const finalAmount = data.amount * rate;
    const transactionId = uuidv4();

    await this.userWallerService.send('update_balance', { userId: Number(data.sender), amount: data.amount, type: 'debit', transaction_id: transactionId }).toPromise();
    await this.userWallerService.send('update_balance', { userId: Number(data.receiver), amount: finalAmount, type: 'credit', transaction_id: transactionId }).toPromise();

    this.ledgerService.send('write_ledger', {
      account_id: data.sender,
      transaction_id: transactionId,
      type: 'DEBIT',
      amount: data.amount,
      currency: fxCheck.quote.base,
      fx_rate: rate,
      description: `Transfer (Quote: ${data.quoteId})`
    }).subscribe();


    this.ledgerService.send('write_ledger', {
      account_id: data.receiver,
      transaction_id: transactionId,
      type: 'CREDIT',
      amount: finalAmount,
      currency: fxCheck.quote.target,
      fx_rate: rate,
      description: `Transfer (Quote: ${data.quoteId})`
    }).subscribe();

    return { status: 'paid', transactionId, rate }
  }
}
