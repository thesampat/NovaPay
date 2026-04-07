import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { createHash } from 'crypto';
import { CheckBalanceDtoTs, PayDtoTs } from 'dto/check-balance.dto.ts/check-balance.dto.ts';

@Injectable()
export class AppService {
  constructor(
    @Inject('USER_WALLET_SERVICE') private userWalletClient: ClientProxy,
    @Inject('TRANSACTION_SERVICE') private transactionClient: ClientProxy,
    @Inject('PAYROLL_SERVICE') private payrollClient: ClientProxy,
    @Inject('ADMIN_SERVICE') private adminClient: ClientProxy
  ) { }

  getHello(): string {
    return 'Hello World!';
  }

  getBalance(data: CheckBalanceDtoTs) {
    return this.userWalletClient.send('get_balance', data);
  }

  createUser(data: any) {
    return this.userWalletClient.send('create_user', data);
  }

  pay(data: PayDtoTs) {
    // Generate deterministic idempotency key for simple repeated submissions
    const fingerprint = `${data.sender}-${data.receiver}-${data.amount}-${new Date().getMinutes()}`;
    const transactionId = createHash('sha256').update(fingerprint).digest('hex');

    const payload = {
      ...data,
      transactionId: data.transactionId || transactionId
    };

    return this.transactionClient.send('transfer_amount', payload);
  }

  processPayroll(data: any) {
    const fingerprint = `${data.sender}-${data.paylist.length}-${new Date().getMinutes()}`;
    const transactionId = createHash('sha256').update(fingerprint).digest('hex');

    const payload = {
      ...data,
      transactionId: data.transactionId || transactionId
    };
    return this.payrollClient.send('run_payroll', payload);
  }

  getPayrollStatus(id: string) {
    return this.payrollClient.send('get_status', { batchId: id });
  }

  adminGetUsers() {
    return this.adminClient.send('admin_get_users', {});
  }

  adminGetLedgers() {
    return this.adminClient.send('admin_get_ledgers', {});
  }

  adminGetStats() {
    return this.adminClient.send('admin_get_stats', {});
  }

  adminResetLedger() {
    return this.adminClient.send('admin_reset_ledger', {});
  }

  adminResetUsers() {
    return this.adminClient.send('admin_reset_users', {});
  }

  adminSeedUsers() {
    return this.adminClient.send('admin_seed_users', {});
  }

  adminRunRefunds() {
    return this.adminClient.send('admin_run_refunds', {});
  }
}

