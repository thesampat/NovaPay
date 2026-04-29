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

  private cachedPreviousHash: string | null = null;

  async writeLedger(entries: Omit<ledgerTypes.ILedgerEntry, 'timestamp' | 'current_hash' | 'previous_hash'>[]) {
    if (!entries || entries.length === 0) return { status: 'success' };

    const transactionId = entries[0].transaction_id;

    try {
      // 1. Get the previous hash from cache or DB if cache is empty
      if (!this.cachedPreviousHash) {
        const lastEntry = await this.ledgerModel.findOne().sort({ _id: -1 }).lean();
        this.cachedPreviousHash = lastEntry ? lastEntry.current_hash : '0'.repeat(64);
      }

      let previousHash = this.cachedPreviousHash;
      const entriesToSave: ledgerTypes.ILedgerEntry[] = [];

      for (const entry of entries) {
        const entryData = {
          ...entry,
          previous_hash: previousHash,
          timestamp: new Date()
        };

        const currentHash = this.calculateHash(entryData);
        previousHash = currentHash; 

        entriesToSave.push({
          ...entryData,
          current_hash: currentHash
        });
      }

      // Update cache for next call
      this.cachedPreviousHash = previousHash;

      await this.ledgerModel.insertMany(entriesToSave);
      return { status: 'success', count: entriesToSave.length };

    } catch (error) {
      this.cachedPreviousHash = null; // Invalidate cache on error to be safe
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



