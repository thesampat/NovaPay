import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { createHash } from 'crypto';
import { CheckBalanceDtoTs, PayDtoTs } from 'dto/check-balance.dto.ts/check-balance.dto.ts';
import { PayrollBulkDto } from 'dto/payroll.dto.ts/payroll.dto.ts';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private kafkaClient: ClientKafka
  ) { }

  async onModuleInit() {
    const topics = [
      'get_balance',
      'create_user',
      'transfer_amount',
      'run_payroll',
      'get_status',
      'admin_get_users',
      'admin_get_ledgers',
      'admin_get_stats',
      'admin_reset_ledger',
      'admin_reset_users',
      'admin_seed_users',
      'admin_run_refunds',
    ];

    topics.forEach(topic => this.kafkaClient.subscribeToResponseOf(topic));
    await this.kafkaClient.connect();
  }

  getHello(): string {
    return 'Hello World!';
  }

  getBalance(data: CheckBalanceDtoTs) {
    return this.kafkaClient.send('get_balance', data);
  }

  createUser(data: any) {
    return this.kafkaClient.send('create_user', data);
  }

  pay(data: PayDtoTs) {
    return this.kafkaClient.send('transfer_amount', data);
  }

  processPayroll(data: PayrollBulkDto) {
    return this.kafkaClient.send('run_payroll', data);
  }

  getPayrollStatus(id: string) {
    return this.kafkaClient.send('get_status', { batchId: id });
  }



  // admin routes

  adminGetUsers() {
    return this.kafkaClient.send('admin_get_users', {});
  }

  adminGetLedgers() {
    return this.kafkaClient.send('admin_get_ledgers', {});
  }

  adminGetStats() {
    return this.kafkaClient.send('admin_get_stats', {});
  }

  adminResetLedger() {
    return this.kafkaClient.send('admin_reset_ledger', {});
  }

  adminResetUsers() {
    return this.kafkaClient.send('admin_reset_users', {});
  }

  adminSeedUsers() {
    return this.kafkaClient.send('admin_seed_users', {});
  }

  adminRunRefunds() {
    return this.kafkaClient.send('admin_run_refunds', {});
  }
}

