import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OverridableValidationPipe } from './pipes/overriddable-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new OverridableValidationPipe({ whitelist: true, transform: true }),
  );
  await app.listen(3000);
}
bootstrap();
