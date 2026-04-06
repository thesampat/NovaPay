import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @MessagePattern('get_user')
  getUserById(data: { userId: number }) {
    // fields are less so fetching all
    try {
      return this.appService.getUserById(data?.userId)
    } catch (error) {
      return error
    }

  }

  // @MessagePattern('get_all_users')
  // getAllUser() {
  //   try {
  //     return this.appService.getAllUsers()
  //   } catch (error) {
  //     return error
  //   }
  // }
}
