import { IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RabbitConfig {
  @IsString()
  USER: string;

  @IsString()
  PASS: string;
}

export class MongoConfig {
  @IsString()
  USER: string;

  @IsString()
  PASS: string;

  @IsString()
  DB: string;

  @IsString()
  PORT = '27017';
}

export class RootConfig {
  @Type(() => MongoConfig)
  @ValidateNested()
  MONGO: MongoConfig;

  @Type(() => RabbitConfig)
  @ValidateNested()
  RABBITMQ: RabbitConfig;
}
