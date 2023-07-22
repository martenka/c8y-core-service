import { Test, TestingModule } from '@nestjs/testing';
import { Logger, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { Connection, Types } from 'mongoose';
import { User } from '../../../models';

import { fakeTime } from '../../../utils/tests';
import { getModelToken, MongooseModuleOptions } from '@nestjs/mongoose';
import { ApplicationConfigService } from '../../application-config/application-config.service';

import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtModuleOptions } from '@nestjs/jwt/dist/interfaces/jwt-module-options.interface';
import { getTestJwtConfig, getTestUser } from '../../../tests/helpers/auth';
import { JwtStrategy } from '../jwt/jwt.strategy';

import { MessagesProducerService } from '../../messages/messages-producer.service';

import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { LocalStrategy } from '../local/local.strategy';
import { PassportModule } from '@nestjs/passport';
import { UsersService } from '../../users/users.service';
import { UserModel, UserSchema } from '../../../models/User';
import { DefaultUserType } from '../../application-config/types/types';
import { usersMongoosePasswordHashMiddleware } from '../../users/helpers/middleware';
import * as bcrypt from 'bcrypt';
import { UserOutputDto } from '../../users/dto/output/output-user.dto';
import { SendMessageParams } from '../../messages/types/producer';
import { ExchangeTypes } from '../../messages/types/exchanges';
import { getCreateUserDtoStub } from '../../../tests/stubs/user';
import { Role } from '../../../global/types/roles';
import {
  setupTest,
  WithIntegrationSetupTestResult,
} from '../../../../test/setup/setup';

type AuthIntegrationExtension = WithIntegrationSetupTestResult<{
  models: {
    usersModel: UserModel;
  };
  services: {
    jwtService: JwtService;
    messagesProducerService: MessagesProducerService;
  };
}>;
describe('Auth integration test', () => {
  const now = new Date();
  let shouldSkipUsersMiddleware = false;
  beforeEach(() => fakeTime({ now, fake: ['Date'] }));
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  async function applyUsersPasswordHashMiddleware(
    configService: ApplicationConfigService,
  ) {
    await usersMongoosePasswordHashMiddleware(
      configService,
      shouldSkipUsersMiddleware,
    );
    shouldSkipUsersMiddleware = true;
  }

  function withTest(
    callback: (props: AuthIntegrationExtension) => Promise<void>,
  ): () => Promise<void> {
    async function setupFn(
      connection: Connection,
    ): Promise<AuthIntegrationExtension> {
      const testingConfigService: ApplicationConfigService = {
        get mongooseModuleOptions(): MongooseModuleOptions {
          return {
            uri: process.env.MONGO__CONNECTION_URI,
            minPoolSize: 3,
            maxPoolSize: 5,
            autoIndex: true,
          };
        },
        get secretConfig() {
          return {
            SALT_WORK_FACTOR: 1,
          };
        },
        get jwtConfig(): JwtModuleOptions {
          return getTestJwtConfig();
        },
        get defaultUser(): DefaultUserType | undefined {
          return undefined;
        },
      } as ApplicationConfigService;

      await applyUsersPasswordHashMiddleware(testingConfigService);

      const usersModel = connection.model(User.name, UserSchema);

      const messagesProducerService = new MessagesProducerService(null);

      const testJwtService = new JwtService(getTestJwtConfig());

      const testingModule: TestingModule = await Test.createTestingModule({
        imports: [
          PassportModule,
          JwtModule.registerAsync({
            useFactory: () => testingConfigService.jwtConfig,
          }),
        ],
        controllers: [AuthController],
        providers: [
          {
            provide: ApplicationConfigService,
            useValue: testingConfigService,
          },
          {
            provide: MessagesProducerService,
            useValue: messagesProducerService,
          },
          { provide: APP_GUARD, useClass: JwtAuthGuard },
          { provide: getModelToken(User.name), useValue: usersModel },
          { provide: JwtService, useValue: testJwtService },
          JwtStrategy,
          AuthService,
          UsersService,
          LocalStrategy,
        ],
      })
        .setLogger(new Logger())
        .compile();

      const app = testingModule.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await app.init();

      return {
        app,
        models: {
          usersModel,
        },
        services: {
          jwtService: testJwtService,
          messagesProducerService,
        },
      };
    }

    return setupTest<AuthIntegrationExtension>(setupFn, callback);
  }

  it.concurrent(
    'registers a new user',
    withTest(async ({ app, models, services }) => {
      const testUser = getTestUser('rnu_user', '647cc121d44680b070079a21', {
        jwtService: services.jwtService,
      });

      const sendMessageSpy = jest
        .spyOn(services.messagesProducerService, 'sendMessage')
        .mockImplementation((_args) => undefined);

      const output = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'auth_test_user',
          password: '1234',
          c8yCredentials: {
            username: 'test',
            password: '234',
            tenantID: 'test_tenant',
            baseAddress: 'https://www.test.com',
          },
        })
        .set('Authorization', `Bearer ${testUser.userToken}`);

      const userEntity = await models.usersModel
        .findOne({ username: 'auth_test_user' })
        .select('+password')
        .exec();

      expect(userEntity).toBeDefined();

      expect(await bcrypt.compare('1234', userEntity.password)).toBe(true);
      expect(output.status).toEqual(201);
      expect(output.body).toMatchObject<Partial<UserOutputDto>>({
        username: 'auth_test_user',
        roles: ['User'],
        c8yCredentials: {
          username: 'test',
          password: '234',
          tenantID: 'test_tenant',
          baseAddress: 'https://www.test.com',
        },
      });
      expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
        ExchangeTypes.GENERAL,
        'user.user',
        {
          id: expect.any(String),
          c8yCredentials: {
            username: 'test',
            password: '234',
            tenantID: 'test_tenant',
            baseAddress: 'https://www.test.com',
          },
        },
      );
    }),
  );

  it.concurrent(
    'does not allow user registration without admin user',
    withTest(async ({ app, services }) => {
      const testUser = getTestUser('dnruwau_user', '647d05f99a685b9747b203c0', {
        jwtService: services.jwtService,
        roles: [Role.User],
      });

      jest
        .spyOn(services.messagesProducerService, 'sendMessage')
        .mockImplementation((_args) => undefined);

      const output = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'auth_test_user_2',
          password: '1234',
          c8yCredentials: {
            username: 'test',
            password: '234',
            tenantID: 'test_tenant',
            baseAddress: 'https://www.test.com',
          },
        })
        .set('Authorization', `Bearer ${testUser.userToken}`);

      expect(output.status).toEqual(403);
    }),
  );

  it(
    'logins existing user',
    withTest(async ({ app, models }) => {
      const userStub = getCreateUserDtoStub({
        password: 'testPW',
        username: 'elu_user',
      });

      await models.usersModel.create({
        ...userStub,
        _id: new Types.ObjectId('647cd64e27b4a1896abbe42e'),
      });

      const output = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'elu_user',
          password: 'testPW',
        });

      expect(output.status).toEqual(201);
      expect(output.body).toMatchObject({
        access_token: expect.any(String),
      });
    }),
  );
});
