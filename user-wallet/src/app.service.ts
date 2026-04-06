import { Injectable } from '@nestjs/common';
import { IUSER } from './user.types';
import { UserModel } from './user.schema';
import { tryCatch } from 'bullmq';
import { MessagePattern } from '@nestjs/microservices';

@Injectable()
export class AppService {
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

  @MessagePattern('update_balance')
  async updateBalance(data: { userId: number, amount: number, type: 'debit' | 'credit' }) {
    if (data.type === 'debit') {
      const res = await UserModel.updateOne({ account_id: data.userId, balance: { $gt: data.amount } }, { $inc: { balance: -data.amount } })
      if (res.modifiedCount === 0) {
        throw new Error('Insufficient balance')
      }
      return { status: 'success' }
    } else {
      await UserModel.updateOne({ account_id: data.userId }, { $inc: { balance: data.amount } })
      return { status: 'success' }
    }

  }
}
