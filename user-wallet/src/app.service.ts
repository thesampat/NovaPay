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

  getUserById(id: number): Promise<IUSER | null> {
    try {
      return this.userModel.findOne({ account_id: id });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async updateBalance(data: { userId: number, amount: number, type: 'debit' | 'credit', transaction_id: string }) {
    if (data.type === 'credit' && data.transaction_id?.includes('fail')) {
      throw new Error('SIMULATED CREDIT FAILURE');
    }
    const user = await this.userModel.findOne({ account_id: data.userId });
    if (!user) throw new Error('User not found');


    if (data.type === 'debit') {
      const res = await this.userModel.updateOne(
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
      const res = await this.userModel.updateOne(
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


  async checkTransaction(userId: number, transactionId: string) {
    const user = await this.userModel.findOne({ account_id: userId, processed_transactions: transactionId });
    return { processed: !!user };
  }

  async getCurrency(sender, receiver) {
    let user = await this.userModel.find({ account_id: { $in: [sender, receiver] } }, { currency: 1, account_id: 1, _id: 0 })
    console.log('him on user', user, sender, receiver)
    return user
  }




}
