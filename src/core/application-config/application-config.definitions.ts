import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsStrongPassword,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class RabbitConfig {
  @IsString()
  USER: string;

  @IsString()
  PASS: string;
}

export class MongoConfig {
  @IsOptional()
  @IsString()
  USER: string;

  @IsOptional()
  @IsString()
  PASS: string;

  @IsOptional()
  @IsString()
  DB: string;

  @IsString()
  PORT = '27017';

  @IsOptional()
  @IsString()
  CONNECTION_URI?: string;
}

export class JwtConfig {
  @IsStrongPassword()
  SECRET: string;

  @IsString()
  EXPIRES_IN: string;
}

export class MinioConfig {
  @IsString()
  @IsNotEmpty()
  URL: string;
}

export class DefaultUserConfig {
  @IsOptional()
  @IsString()
  USER?: string;

  @IsOptional()
  @IsString()
  PASS?: string;

  @IsOptional()
  @IsString()
  C8Y_USER?: string;

  @IsOptional()
  @IsString()
  C8Y_PASS?: string;

  @IsOptional()
  @IsString()
  C8Y_TENANT_ID?: string;

  @IsOptional()
  @IsString()
  C8Y_TENANT_DOMAIN?: string;
}

export class SecretConfig {
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber({ allowInfinity: false, allowNaN: false })
  SALT_WORK_FACTOR = 10;
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

  @IsOptional()
  @Type(() => SecretConfig)
  @ValidateNested()
  SECRET: SecretConfig = new SecretConfig();

  @Type(() => MinioConfig)
  @ValidateNested()
  MINIO: MinioConfig;

  @IsOptional()
  @Type(() => DefaultUserConfig)
  @ValidateNested({ message: 'Error validation' })
  DEFAULT: DefaultUserConfig = new DefaultUserConfig();
}
