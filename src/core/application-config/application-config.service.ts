import { Injectable } from '@nestjs/common';
import {
  DefaultUserConfig,
  JwtConfig,
  MinioConfig,
  MongoConfig,
  RabbitConfig,
  SecretConfig,
} from './application-config.definitions';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import { RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';
import { ExchangeTypes } from '../messages/types/exchanges';
import { JwtModuleOptions } from '@nestjs/jwt/dist/interfaces/jwt-module-options.interface';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { UserType } from '../../models/User';
import { Role } from '../../global/types/roles';
import { notNil } from '../../utils/validation';

@Injectable()
export class ApplicationConfigService {
  private defaultUserViewed = false;

  constructor(
    readonly mongoEnvironment: MongoConfig,
    readonly rabbitEnvironment: RabbitConfig,
    readonly jwtEnvironment: JwtConfig,
    readonly secretEnvironment: SecretConfig,
    readonly minioEnvironment: MinioConfig,
    private readonly defaultUserEnvironment: DefaultUserConfig,
  ) {
    const mongoConfig = this.mongoEnvironment;
    if (
      isNil(mongoConfig.CONNECTION_URI) &&
      (isNil(mongoConfig.USER) ||
        isNil(mongoConfig.PASS) ||
        isNil(mongoConfig.DB) ||
        isNil(mongoConfig.PORT))
    ) {
      throw new Error(
        'Unable to create MongoDB connection. Check Mongo ENV variables, either URI or USER,PASS, DB and PORT must be present!',
      );
    }
  }

  get mongooseModuleOptions(): MongooseModuleOptions {
    return {
      uri:
        this.mongoEnvironment.CONNECTION_URI ??
        `mongodb://${this.mongoEnvironment.USER}:${this.mongoEnvironment.PASS}@localhost:${this.mongoEnvironment.PORT}`,
      dbName: this.mongoEnvironment.DB,
      minPoolSize: 3,
      maxPoolSize: 5,
      autoIndex: true,
    };
  }

  get messagingConfig(): RabbitMQConfig {
    return {
      exchanges: [
        {
          name: ExchangeTypes.GENERAL,
          type: 'topic',
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
        algorithm: 'HS256',
        expiresIn: this.jwtEnvironment.EXPIRES_IN,
      },
      secret: this.jwtEnvironment.SECRET,
      verifyOptions: {
        algorithms: ['HS256'],
      },
    };
  }

  get secretConfig() {
    return {
      SALT_WORK_FACTOR: this.secretEnvironment.SALT_WORK_FACTOR,
    };
  }

  get minioConfig() {
    return {
      url: this.minioEnvironment.URL,
    };
  }

  get defaultUser():
    | Pick<UserType, 'roles' | 'username' | 'password' | 'c8yCredentials'>
    | undefined {
    if (!this.defaultUserViewed) {
      if (this.defaultUserEnvironment.USER === '') {
        throw new Error('Default user username cannot be empty string!');
      }

      if (
        notNil(this.defaultUserEnvironment.USER) &&
        (isNil(this.defaultUserEnvironment.C8Y_USER) ||
          isNil(this.defaultUserEnvironment.C8Y_TENANT_ID) ||
          isNil(this.defaultUserEnvironment.PASS) ||
          isNil(this.defaultUserEnvironment.C8Y_PASS) ||
          isNil(this.defaultUserEnvironment.C8Y_TENANT_DOMAIN))
      ) {
        throw new Error(
          'Default user password and Cumulocity account details must also be provided if default username is provided',
        );
      }
      const user = {
        username: this.defaultUserEnvironment.USER,
        password: this.defaultUserEnvironment.PASS,
        roles: [Role.Admin, Role.User],
        c8yCredentials: {
          username: this.defaultUserEnvironment.C8Y_USER,
          password: this.defaultUserEnvironment.C8Y_PASS,
          tenantID: this.defaultUserEnvironment.C8Y_TENANT_ID,
          baseAddress: this.defaultUserEnvironment.C8Y_TENANT_DOMAIN,
        },
      };
      this.defaultUserViewed = true;
      return user;
    }
    return undefined;
  }
}
