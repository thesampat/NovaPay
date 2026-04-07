import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessagePattern } from '@nestjs/microservices';
import * as ledgerTypes from './ledger.types';
import { createHash } from 'crypto';

@Injectable()
export class AppService {
  constructor(
    @InjectModel('Ledger') private readonly ledgerModel: Model<ledgerTypes.ILedgerEntry>
  ) { }
  getHello(): string {
    return 'Hello World!';
  }

  private calculateHash(data: any): string {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  async writeLedger(data: Omit<ledgerTypes.ILedgerEntry, 'timestamp' | 'current_hash' | 'previous_hash'>) {
    if (data.amount === 999) {
      throw new Error('SIMULATED LEDGER FAILURE');
    }
    try {
      const lastEntry = await this.ledgerModel.findOne().sort({ timestamp: -1 });
      const previousHash = lastEntry ? lastEntry.current_hash : '0'.repeat(64);

      const entryData = {
        ...data,
        previous_hash: previousHash,
      };

      const currentHash = this.calculateHash(entryData);

      await this.ledgerModel.create({
        ...entryData,
        current_hash: currentHash,
      });

      return { status: 'success', hash: currentHash };
    } catch (error) {
      console.error('Ledger error:', error);
      throw error;
    }
  }

  async updateLedgerStatus(data: { transaction_id: string, status: ledgerTypes.ILedgerEntry['status'] }) {
    try {
      await this.ledgerModel.updateMany({ transaction_id: data.transaction_id }, { $set: { status: data.status } });
      return { status: 'success' };
    } catch (error) {
      console.error('Ledger error:', error);
      throw error;
    }
  }
}



