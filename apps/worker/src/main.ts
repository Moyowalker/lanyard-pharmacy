import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLogger } from './modules/observability/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(AppLogger));
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 4010);
}

void bootstrap();
