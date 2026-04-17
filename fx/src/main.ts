
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.SERVICE_NAME ? 'kafka:29092' : 'localhost:9092'],
      },
      consumer: {
        groupId: 'fx-consumer',
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(3004, '0.0.0.0');
  console.log('FX Service is running as a Hybrid App (HTTP on 3004 + Kafka)');
}
bootstrap();
