import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import Redis from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [PrometheusModule.register()],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: process.env.SERVICE_NAME ? 'redis' : '127.0.0.1',
          port: 6379,
        });
      },
    },
  ],
})
export class AppModule {}
