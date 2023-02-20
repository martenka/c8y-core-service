import { IsString, IsStrongPassword, ValidateNested } from 'class-validator';
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

export class JwtConfig {
  @IsStrongPassword()
  SECRET: string;

  @IsString()
  EXPIRES_IN: string;
}

export class RootConfig {
  @Type(() => MongoConfig)
  @ValidateNested()
  MONGO: MongoConfig;

  @Type(() => RabbitConfig)
  @ValidateNested()
  RABBITMQ: RabbitConfig;

  @Type(() => JwtConfig)
  @ValidateNested()
  JWT: JwtConfig;
}
