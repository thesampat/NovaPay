import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { LedgerSchema } from './ledger.schema';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.SERVICE_NAME ? 'mongodb://mongodb:27017/ledger' : 'mongodb://localhost:27017/ledger'),
    MongooseModule.forFeature([{ name: 'Ledger', schema: LedgerSchema }])
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
