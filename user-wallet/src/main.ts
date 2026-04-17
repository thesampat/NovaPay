import './tracing';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.SERVICE_NAME ? 'kafka:29092' : 'localhost:9092'],
      },
      consumer: {
        groupId: 'user-wallet-consumer',
        fromBeginning: true,
      },
    },
  });

  await app.startAllMicroservices();
  const port = 3001;
  await app.listen(port).then(() => {
    console.log(`User Wallet is running as a Hybrid App (HTTP on ${port} + Kafka)`);
  });
}
bootstrap();

