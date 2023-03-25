import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RedocModule } from '@juicyllama/nestjs-redoc';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const apiConfig = new DocumentBuilder()
    .setTitle('Cumuservice')
    .setDescription('This API describes the operations of cumuservice')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, apiConfig);
  await RedocModule.setup('/v1/api', app, document, {});
  await app.listen(3000);
}
bootstrap();
