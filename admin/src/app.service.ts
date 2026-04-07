import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AppService {
  constructor(
    @InjectModel('Users', 'usersConnection') private userModel: Model<any>,
    @InjectModel('Ledger', 'ledgerConnection') private ledgerModel: Model<any>,
  ) {}

  async getAllUsers() {
    return this.userModel.find({}, '-name -age -gender').lean();
  }

  async getAllLedgers() {
    return this.ledgerModel.find().sort({ timestamp: -1 }).limit(100).lean();
  }

  async getPlatformStats() {
    const totalUsers = await this.userModel.countDocuments();
    const ledgerCount = await this.ledgerModel.countDocuments();
    return { totalUsers, ledgerCount };
  }
}
