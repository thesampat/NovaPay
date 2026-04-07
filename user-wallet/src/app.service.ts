import { Injectable } from '@nestjs/common';
import { IUSER } from './user.types';
import { UserModel } from './user.schema';
import { tryCatch } from 'bullmq';
import { MessagePattern } from '@nestjs/microservices';

import { EncryptionService } from './encryption.service';

@Injectable()
export class AppService {
  constructor(
    private readonly encryptionService: EncryptionService
  ) {}

  async createUser(data: { account_id: number, balance: number, currency: string, name: string, age: string, gender: string }) {
    const newUser = new UserModel({
      account_id: data.account_id,
      balance: data.balance,
      currency: data.currency,
      name: this.encryptionService.encrypt(data.name),
      age: this.encryptionService.encrypt(data.age),
      gender: this.encryptionService.encrypt(data.gender),
    });

    await newUser.save();
    return { status: 'success', account_id: data.account_id };
  }

  async getUserWithDecryption(id: number) {
    const user = await UserModel.findOne({ account_id: id });
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

  getUserById(id: number): Promise<IUSER | null> {
    try {
      return UserModel.findOne({ account_id: id });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async updateBalance(data: { userId: number, amount: number, type: 'debit' | 'credit', transaction_id: string }) {
    const user = await UserModel.findOne({ account_id: data.userId });
    if (!user) throw new Error('User not found');


    if (data.type === 'debit') {
      const res = await UserModel.updateOne(
        {
          account_id: data.userId,
          balance: { $gte: data.amount },
          processed_transactions: { $ne: data.transaction_id }
        },
        {
          $inc: { balance: -data.amount },
          $push: { processed_transactions: data.transaction_id }
        }
      );

      if (res.modifiedCount === 0) {
        throw new Error('Insufficient balance or transaction already processed');
      }
      return { status: 'success' };
    } else {
      const res = await UserModel.updateOne(
        {
          account_id: data.userId,
          processed_transactions: { $ne: data.transaction_id }
        },
        {
          $inc: { balance: data.amount },
          $push: { processed_transactions: data.transaction_id }
        }
      );

      if (res.modifiedCount === 0) {
        return { status: 'success', message: 'Already credited' };
      }
      return { status: 'success' };
    }
  }


  getCurrency(sender, receiver) {
    return UserModel.find({ account_id: { $in: [sender, receiver] } }, { currency: 1, account_id: 1, _id: 0 })
  }




}
