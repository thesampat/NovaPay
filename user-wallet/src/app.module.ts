import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { EncryptionService } from './encryption.service';
import { UserSchema } from './user.schema';

@Module({
  imports: [
    PrometheusModule.register(),
    MongooseModule.forRoot('mongodb://mongodb:27017/users', { maxPoolSize: 100 }),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }])
  ],
  controllers: [AppController],
  providers: [AppService, EncryptionService],
})
export class AppModule { }
