import { Injectable } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import * as ledgerTypes from './ledger.types';
import { LedgerModel } from './ledger.schema';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  @MessagePattern('write_ledger')
  writeLedger(data: Omit<ledgerTypes.ILedgerEntry, 'timestamp'>) {
    try {
      LedgerModel.create(data);
      return { status: 'success' }
    } catch (error) {
      console.log(error);
      return { status: 'error' }
    }
  }
}
