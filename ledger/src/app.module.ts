import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { LedgerSchema } from './ledger.schema';

@Module({
  imports: [
    PrometheusModule.register(),
    MongooseModule.forRoot(process.env.SERVICE_NAME ? 'mongodb://mongodb:27017/ledger?replicaSet=rs0&directConnection=true' : 'mongodb://localhost:27017/ledger?replicaSet=rs0&directConnection=true'),
    MongooseModule.forFeature([{ name: 'Ledger', schema: LedgerSchema }])
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
