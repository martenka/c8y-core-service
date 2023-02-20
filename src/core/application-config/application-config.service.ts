import { Injectable } from '@nestjs/common';
import {
  JwtConfig,
  MongoConfig,
  RabbitConfig,
  RootConfig,
} from './application-config.definitions';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import { RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';
import { ExchangeTypes } from '../messages/types/exchanges';
import { JwtModuleOptions } from '@nestjs/jwt/dist/interfaces/jwt-module-options.interface';

@Injectable()
export class ApplicationConfigService {
  constructor(
    readonly rootEnvironment: RootConfig,
    readonly mongoEnvironment: MongoConfig,
    readonly rabbitEnvironment: RabbitConfig,
    readonly jwtEnvironment: JwtConfig,
  ) {}

  get mongooseModuleOptions(): MongooseModuleOptions {
    return {
      uri: `mongodb://${this.mongoEnvironment.USER}:${this.mongoEnvironment.PASS}@localhost:${this.mongoEnvironment.PORT}`,
      dbName: this.mongoEnvironment.DB,
      minPoolSize: 3,
      maxPoolSize: 5,
    };
  }

  get messagingConfig(): RabbitMQConfig {
    return {
      exchanges: [
        {
          name: ExchangeTypes.FILE,
          type: 'direct',
          createExchangeIfNotExists: true,
        },
      ],
      uri: `amqp://${this.rabbitEnvironment.USER}:${this.rabbitEnvironment.PASS}@localhost:5672`,
      prefetchCount: 1,
      enableControllerDiscovery: true,
      connectionInitOptions: {
        wait: true,
      },
    };
  }

  get jwtConfig(): JwtModuleOptions {
    return {
      signOptions: {
        expiresIn: this.jwtEnvironment.EXPIRES_IN,
      },
      secret: this.jwtEnvironment.SECRET,
    };
  }
}
