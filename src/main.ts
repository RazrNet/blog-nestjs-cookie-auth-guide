import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const COOKIE_SECRET = configService.get('COOKIE_SECRET');

  app.use(cookieParser(COOKIE_SECRET));

  await app.listen(3000);
}
bootstrap();
