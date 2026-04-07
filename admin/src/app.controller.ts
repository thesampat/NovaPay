import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern('admin_get_users')
  getUsers() {
    return this.appService.getAllUsers();
  }

  @MessagePattern('admin_get_ledgers')
  getLedgers() {
    return this.appService.getAllLedgers();
  }

  @MessagePattern('admin_reset_ledger')
  resetLedger() {
    return this.appService.resetLedger();
  }

  @MessagePattern('admin_reset_users')
  resetUsers() {
    return this.appService.resetUsers();
  }

  @MessagePattern('admin_seed_users')
  seedUsers() {
    return this.appService.seedUsers();
  }

  @MessagePattern('admin_run_refunds')
  runRefunds() {
    return this.appService.runRefunds();
  }

  @MessagePattern('admin_get_stats')
  getStats() {
    return this.appService.getPlatformStats();
  }
}
