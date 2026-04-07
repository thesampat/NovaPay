import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { EncryptionService } from './encryption.service';
import { UserModel, UserSchema } from './user.schema';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://mongodb:27017/users'),
    MongooseModule.forFeature([{ name: 'Users', schema: UserSchema }])
  ],
  controllers: [AppController],
  providers: [AppService, EncryptionService],
})
export class AppModule { }
