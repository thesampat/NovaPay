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

  async writeLedger(entries: Omit<ledgerTypes.ILedgerEntry, 'timestamp' | 'current_hash' | 'previous_hash'>[]) {
    if (!entries || entries.length === 0) return { status: 'success' };

    const transactionId = entries[0].transaction_id;

    // 0. BATCH IDEMPOTENCY CHECK: Ensure the whole batch isn't recorded twice
    const existing = await this.ledgerModel.findOne({ transaction_id: transactionId });
    if (existing) {
      return { status: 'success', message: 'Batch already exists' };
    }

    try {
      let lastEntry = await this.ledgerModel.findOne().sort({ timestamp: -1 });
      let previousHash = lastEntry ? lastEntry.current_hash : '0'.repeat(64);

      const entriesToSave: ledgerTypes.ILedgerEntry[] = [];

      for (const entry of entries) {
        const entryData = {
          ...entry,
          previous_hash: previousHash,
          timestamp: new Date()
        };

        const currentHash = this.calculateHash(entryData);
        previousHash = currentHash; // Advance chain for next leg in batch

        entriesToSave.push({
          ...entryData,
          current_hash: currentHash
        });
      }

      await this.ledgerModel.insertMany(entriesToSave);
      return { status: 'success', count: entriesToSave.length };

    } catch (error) {
      console.error('Ledger Batch Error:', error);
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



