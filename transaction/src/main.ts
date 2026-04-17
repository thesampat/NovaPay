import './tracing';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  // 1. Create a standard Nest application (HTTP)
  const app = await NestFactory.create(AppModule);

  // 2. Connect Kafka as a microservice
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.SERVICE_NAME ? 'kafka:29092' : 'localhost:9092'],
      },
      consumer: {
        groupId: 'transaction-server-group',
        fromBeginning: true,
      },
    },
  });

  // 3. Start the Kafka microservice
  await app.startAllMicroservices();

  // 4. Listen on the HTTP port (for Prometheus and Health Checks)
  const port = 3002;
  await app.listen(port).then(() => {
    console.log(`Transaction Service is running as a Hybrid App (HTTP on ${port} + Kafka)`);
  });
}
bootstrap();

