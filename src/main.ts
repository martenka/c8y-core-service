import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RedocModule } from '@juicyllama/nestjs-redoc';
import { CreateDataFetchDto } from './core/tasks/dto/input/create-datafetch-task.dto';
import { CreateDataUploadTaskDto } from './core/tasks/dto/input/create-dataupload-task.dto';
import { CreateObjectSyncDto } from './core/tasks/dto/input/create-objectsync-task.dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const apiConfig = new DocumentBuilder()
    .setTitle('C8y-Core-Service')
    .setDescription(
      `This API describes the operations of c8y-core-service. 
      To use the methods in this API, user account is required. You can use the default account or create a new user.  
      There are two types of users: administrator and normal users. Only administrator can make state changing operations 
      JWT token is used for authentication with every request. Use it as Bearer token.
    `,
    )
    .addTag(
      'sensors',
      'This module describes the operations related to sensors',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, apiConfig, {
    extraModels: [
      CreateDataFetchDto,
      CreateDataUploadTaskDto,
      CreateObjectSyncDto,
    ],
  });
  await RedocModule.setup('/v1/api', app, document, {});
  const port = process.env.SERVICE__PORT ?? 3000;
  await app.listen(port, () =>
    Logger.log(`App listening on port ${port}`, 'Bootstrap'),
  );
}
bootstrap();
