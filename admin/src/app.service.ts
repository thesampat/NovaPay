import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  constructor(
    @InjectModel('Users', 'usersConnection') private userModel: Model<any>,
    @InjectModel('Ledger', 'ledgerConnection') private ledgerModel: Model<any>,
    @Inject('USER_WALLET_SERVICE') private userWalletClient: ClientProxy,
  ) { }

  async runRefunds() {
    // 1. Find all FAILED transaction IDs
    const failedLedgers = await this.ledgerModel.find({ status: 'FAILED' }).lean();
    const uniqueTxIds = [...new Set(failedLedgers.map(l => l.transaction_id))];
    const results: any[] = [];

    for (const txId of uniqueTxIds) {
      // Find the DEBIT entry for the actual sender (not settlement pool)
      const debitEntry = failedLedgers.find(l => l.transaction_id === txId && l.type === 'DEBIT' && !l.account_id.includes('SETTLEMENT') && l.account_id !== 'PLATFORM_FEE_ACCOUNT');
      
      if (debitEntry) {
        // Check if the user was actually debited in the wallet service
        const walletCheck = await firstValueFrom(this.userWalletClient.send('check_transaction', { userId: Number(debitEntry.account_id), transactionId: txId }));
        
        if (walletCheck.processed) {
          console.log(`Refunding transaction ${txId} for user ${debitEntry.account_id}`);
          
          // Issue refund
          await firstValueFrom(this.userWalletClient.send('update_balance', {
            userId: Number(debitEntry.account_id),
            amount: debitEntry.amount, // Refund only the main amount (or include fee if needed)
            type: 'credit',
            transaction_id: `REFUND_${txId}`
          }));

          // Mark as REFUNDED in ledger
          await this.ledgerModel.updateMany({ transaction_id: txId }, { status: 'REFUNDED' });
          results.push({ txId, action: 'refunded' });
        } else {
          results.push({ txId, action: 'none (not debited)' });
        }
      }
    }
    return { status: 'success', processed: results };
  }

  async getAllUsers() {
    return this.userModel.find({}, '-name -age -gender').lean();
  }

  async getAllLedgers() {
    return this.ledgerModel.find().sort({ timestamp: -1 }).limit(100).lean();
  }

  async resetLedger() {
    await this.ledgerModel.deleteMany({});
    return { status: 'success', message: 'Ledger cleared' };
  }

  async resetUsers() {
    await this.userModel.deleteMany({});
    return { status: 'success', message: 'Users cleared' };
  }

  async seedUsers() {
    await this.userModel.deleteMany({});
    const users: any[] = [];
    for (let i = 1; i <= 1000; i++) {
      users.push({
        account_id: i,
        balance: i === 1 ? 1000000 : 1000,
        currency: i % 2 === 0 ? 'CNY' : 'USD',
        processed_transactions: [],
      });
      if (users.length >= 100) {
        await this.userModel.insertMany(users);
        users.length = 0;
      }
    }
    if (users.length > 0) await this.userModel.insertMany(users);
    return { status: 'success', message: '1000 users seeded' };
  }

  async getPlatformStats() {
    const totalUsers = await this.userModel.countDocuments();
    const ledgerCount = await this.ledgerModel.countDocuments();
    return { totalUsers, ledgerCount };
  }
}
