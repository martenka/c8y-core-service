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
import { Role } from '../../global/types/roles';
import { isPresent, notPresent } from '../../utils/validation';
import { DefaultUserType } from './types/types';

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
      notPresent(mongoConfig.CONNECTION_URI) &&
      (notPresent(mongoConfig.USER) ||
        notPresent(mongoConfig.PASS) ||
        notPresent(mongoConfig.DB) ||
        notPresent(mongoConfig.PORT))
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

  get defaultUser(): DefaultUserType | undefined {
    if (
      notPresent(this.defaultUserEnvironment) ||
      Object.keys(this.defaultUserEnvironment).length === 0
    ) {
      return undefined;
    }

    if (!this.defaultUserViewed) {
      if (this.defaultUserEnvironment.USER === '') {
        throw new Error('Default user username cannot be empty string!');
      }

      if (
        isPresent(this.defaultUserEnvironment.USER) &&
        (notPresent(this.defaultUserEnvironment.C8Y_USER) ||
          notPresent(this.defaultUserEnvironment.C8Y_TENANT_ID) ||
          notPresent(this.defaultUserEnvironment.PASS) ||
          notPresent(this.defaultUserEnvironment.C8Y_PASS) ||
          notPresent(this.defaultUserEnvironment.C8Y_TENANT_DOMAIN))
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
      if (notPresent(user.username)) {
        return undefined;
      }

      return user as DefaultUserType;
    }
    return undefined;
  }
}
