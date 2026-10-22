import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  const frontendUrl = (
    process.env.FRONTEND_URL ?? 'http://localhost:3001'
  ).replace(/\/+$/, '');
  app.enableCors({
    origin: frontendUrl,
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();