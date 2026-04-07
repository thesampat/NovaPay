import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AppService } from './app.service';
import * as ledgerTypes from './ledger.types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @MessagePattern('write_ledger')
  async writeLedger(data: Omit<ledgerTypes.ILedgerEntry, 'timestamp' | 'current_hash' | 'previous_hash'>) {
    return this.appService.writeLedger(data);
  }

  @MessagePattern('update_ledger_status')
  async updateLedgerStatus(data: { transaction_id: string, status: ledgerTypes.ILedgerEntry['status'] }) {
    return this.appService.updateLedgerStatus(data);
  }
}
