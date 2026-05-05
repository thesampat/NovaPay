import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUSER } from './user.types';
import { MessagePattern } from '@nestjs/microservices';

import { EncryptionService } from './encryption.service';

@Injectable()
export class AppService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<IUSER>,
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

  async updateBalance(
    data: {
      userId: string;
      amount: number;
      type: 'debit' | 'credit';
      transaction_id: string;
    }[]
  ) {

    console.log({ datamap: data })

    const operations = data.map((item) => {

      if (item.type === 'credit' && item.transaction_id?.includes('fail')) {
        throw new Error('SIMULATED CREDIT FAILURE');
      }

      const filter: any = {
        account_id: item.userId,
      };

      if (item.type === 'debit') {
        filter.balance = { $gte: item.amount }; // prevent overdraft
      }

      return {
        updateOne: {
          filter,
          update: {
            $inc: {
              balance: item.type === 'credit' ? item.amount : -item.amount,
            },
          },
        },
      };
    });

    const result = await this.userModel.bulkWrite(operations, {
      ordered: false, // important: continue even if some fail
    });

    if (result.modifiedCount !== data.length) {
      throw new Error('Some balance updates failed');
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

  async getCurrency(users: any) {
    const userIds = Array.isArray(users) ? users : users?.users;

    if (!Array.isArray(userIds)) {
      throw new Error('Invalid users input');
    }

    return this.userModel.find(
      { account_id: { $in: userIds.map(Number) } },
      { currency: 1, account_id: 1, _id: 0 }
    );
  }




}
