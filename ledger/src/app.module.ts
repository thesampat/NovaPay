import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule.forRoot(process.env.SERVICE_NAME ? 'mongodb://mongodb:27017/ledger' : 'mongodb://localhost:27017/ledger')],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
