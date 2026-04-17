import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserSchema } from './schemas/user.schema';
import { LedgerSchema } from './schemas/ledger.schema';

const isDocker = !!process.env.SERVICE_NAME;

@Module({
  imports: [
    PrometheusModule.register(),
    MongooseModule.forRoot(isDocker ? 'mongodb://mongodb:27017/users?replicaSet=rs0&directConnection=true' : 'mongodb://localhost:27017/users?replicaSet=rs0&directConnection=true', {
      connectionName: 'usersConnection',
    }),
    MongooseModule.forRoot(isDocker ? 'mongodb://mongodb:27017/ledger?replicaSet=rs0&directConnection=true' : 'mongodb://localhost:27017/ledger?replicaSet=rs0&directConnection=true', {
      connectionName: 'ledgerConnection',
    }),
    MongooseModule.forFeature([{ name: 'Users', schema: UserSchema }], 'usersConnection'),
    MongooseModule.forFeature([{ name: 'Ledger', schema: LedgerSchema }], 'ledgerConnection'),
    ClientsModule.register([
      // {
      //   name: 'USER_WALLET_SERVICE',
      //   transport: Transport.TCP,
      //   options: { host: isDocker ? 'user-wallet' : '127.0.0.1', port: 3001 },
      // },
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: [process.env.SERVICE_NAME ? 'kafka:29092' : 'localhost:9092'],
          },
          consumer: {
            groupId: 'transaction-consumer',
          },
        },
      }
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
