import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUSER } from './user.types';
import { MessagePattern } from '@nestjs/microservices';

import { EncryptionService } from './encryption.service';

@Injectable()
export class AppService {
  constructor(
    @InjectModel('Users') private readonly userModel: Model<IUSER>,
    private readonly encryptionService: EncryptionService
  ) { }

  async createUser(data: { account_id: number, balance: number, currency: string, name: string, age: string, gender: string }) {
    const newUser = new this.userModel({
      account_id: data.account_id,
      balance: data.balance,
      currency: data.currency,
      name: data.name ? this.encryptionService.encrypt(data.name) : undefined,
      age: data.age ? this.encryptionService.encrypt(data.age) : undefined,
      gender: data.gender ? this.encryptionService.encrypt(data.gender) : undefined,
    });

    await newUser.save();
    return { status: 'success', account_id: data.account_id };
  }

  async getUserWithDecryption(id: number) {
    const user = await this.userModel.findOne({ account_id: id });
    if (!user) return null;

    return {
      account_id: user.account_id,
      balance: user.balance,
      currency: user.currency,
      name: user.name ? this.encryptionService.decrypt(user.name) : null,
      age: user.age ? this.encryptionService.decrypt(user.age) : null,
      gender: user.gender ? this.encryptionService.decrypt(user.gender) : null,
    };
  }

  getHello(): string {

    return 'Hello World! User Wallet';
  }

  async getBalance(id: number): Promise<number> {
    const user = await this.userModel.findOne({ account_id: id }, { balance: 1 }).lean();
    return user ? user.balance : 0;
  }

  getUserById(id: number): Promise<IUSER | null> {
    try {
      return this.userModel.findOne({ account_id: id }).lean();
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async updateBalance(data: { userId: number, amount: number, type: 'debit' | 'credit', transaction_id: string }) {
    if (data.type === 'credit' && data.transaction_id?.includes('fail')) {
      throw new Error('SIMULATED CREDIT FAILURE');
    }

    const filter: any = {
      account_id: data.userId,
      processed_transactions: { $ne: data.transaction_id }
    };

    if (data.type === 'debit') {
      filter.balance = { $gte: data.amount };
    }

    const update = {
      $inc: { balance: data.type === 'credit' ? data.amount : -data.amount },
      $push: { processed_transactions: data.transaction_id }
    };

    const res = await this.userModel.updateOne(filter, update);

    if (res.modifiedCount === 0) {
      // Check if it failed because it was already processed or insufficient funds
      const alreadyProcessed = await this.userModel.findOne({
        account_id: data.userId,
        processed_transactions: data.transaction_id
      });

      if (alreadyProcessed) {
        return { status: 'success', message: 'Already processed' };
      }

      throw new Error(data.type === 'debit' ? 'Insufficient balance or User not found' : 'User not found');
    }

    return { status: 'success' };
  }

  async checkTransaction(userId: number, transactionId: string) {
    const user = await this.userModel.findOne({
      account_id: userId,
      processed_transactions: transactionId
    });
    return { processed: !!user };
  }

  async getCurrency(sender, receiver) {
    let user = await this.userModel.find({ account_id: { $in: [sender, receiver] } }, { currency: 1, account_id: 1, _id: 0 })
    return user
  }




}
