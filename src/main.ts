import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
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
  const port = process.env.SERVICE__PORT ?? 3000;
  await app.listen(port, () =>
    Logger.log(`App listening on port ${port}`, 'Bootstrap'),
  );
}
bootstrap();
