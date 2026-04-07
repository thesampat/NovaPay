import { Injectable } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import * as ledgerTypes from './ledger.types';
import { LedgerModel } from './ledger.schema';
import { createHash } from 'crypto';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  private calculateHash(data: any): string {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  @MessagePattern('write_ledger')
  async writeLedger(data: Omit<ledgerTypes.ILedgerEntry, 'timestamp' | 'current_hash' | 'previous_hash'>) {
    try {
      const lastEntry = await LedgerModel.findOne().sort({ timestamp: -1 });
      const previousHash = lastEntry ? lastEntry.current_hash : '0'.repeat(64);

      const entryData = {
        ...data,
        previous_hash: previousHash,
      };

      const currentHash = this.calculateHash(entryData);

      await LedgerModel.create({
        ...entryData,
        current_hash: currentHash,
      });

      return { status: 'success', hash: currentHash };
    } catch (error) {
      console.error('Ledger Hashing Error:', error);
      return { status: 'error', message: error.message };
    }
  }

  @MessagePattern('update_ledger_status')
  async updateLedgerStatus(data: { transaction_id: string, status: ledgerTypes.ILedgerEntry['status'] }) {
    try {
      await LedgerModel.updateMany({ transaction_id: data.transaction_id }, { $set: { status: data.status } });
      return { status: 'success' };
    } catch (error) {
      console.error('Ledger Update Error:', error);
      return { status: 'error', message: error.message };
    }
  }
}



