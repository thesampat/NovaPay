import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserSchema } from './schemas/user.schema';
import { LedgerSchema } from './schemas/ledger.schema';

const isDocker = !!process.env.SERVICE_NAME;

@Module({
  imports: [
    MongooseModule.forRoot(isDocker ? 'mongodb://mongodb:27017/users' : 'mongodb://localhost:27017/users', {
      connectionName: 'usersConnection',
    }),
    MongooseModule.forRoot(isDocker ? 'mongodb://mongodb:27017/ledger' : 'mongodb://localhost:27017/ledger', {
      connectionName: 'ledgerConnection',
    }),
    MongooseModule.forFeature([{ name: 'Users', schema: UserSchema }], 'usersConnection'),
    MongooseModule.forFeature([{ name: 'Ledger', schema: LedgerSchema }], 'ledgerConnection'),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
