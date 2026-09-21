import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const isObserveConfigured = Boolean(
    process.env.OBSERVE_APP_KEY &&
      process.env.OBSERVE_APP_SECRET &&
      process.env.OBSERVE_APP_KEY !== 'YOUR_APP_KEY',
  );

  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
    ...(isObserveConfigured ? { instrument: ObserveInstrument } : {}),
  });

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Indirex Authentication & Dynamic RBAC API')
    .setDescription(
      'Enterprise NestJS Authentication, User Management, and Dynamic Database-Driven Role-Based Access Control (RBAC) System backed by PostgreSQL.',
    )
    .setVersion('1.0')
    .addCookieAuth('auth_session', {
      type: 'apiKey',
      in: 'cookie',
      name: 'auth_session',
      description: 'HTTP-Only session cookie obtained via /auth/login',
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation available at: http://localhost:${port}/docs`);
}
await bootstrap();
