import { Test, TestingModule } from '@nestjs/testing';
import { Logger, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { Connection, Types } from 'mongoose';
import { User } from '../../../models';
import { UserModel, UserSchema } from '../../../models/User';
import { MessagesProducerService } from '../../messages/messages-producer.service';

import {
  getModelToken,
  MongooseModule,
  MongooseModuleOptions,
} from '@nestjs/mongoose';
import { ApplicationConfigService } from '../../application-config/application-config.service';
import { usersMongoosePasswordHashMiddleware } from '../helpers/middleware';
import { getCreateUserDtoStub } from '../../../tests/stubs/user';
import { omit } from '../../../utils/helpers';
import { UserOutputDto } from '../dto/output/output-user.dto';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../../auth/jwt/jwt-auth.guard';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtModuleOptions } from '@nestjs/jwt/dist/interfaces/jwt-module-options.interface';
import { getTestJwtConfig, getTestJwtToken } from '../../../tests/helpers/auth';
import { JwtStrategy } from '../../auth/jwt/jwt.strategy';
import { Role } from '../../../global/types/roles';
import { SendMessageParams } from '../../messages/types/producer';
import { ExchangeTypes } from '../../messages/types/exchanges';
import {
  setupTest,
  WithIntegrationSetupTestResult,
} from '../../../../test/setup/setup';
import { fakeTime } from '../../../utils/tests';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

type UsersIntegrationExtension = WithIntegrationSetupTestResult<{
  models: {
    userModel: UserModel;
  };
  services: {
    messagesProducerService: MessagesProducerService;
    jwtService: JwtService;
  };
  sendMessageSpy: jest.SpyInstance<void, SendMessageParams>;
}>;
describe('Users integration test', () => {
  const now = new Date();

  function withTest(
    callback: (params: UsersIntegrationExtension) => Promise<void>,
  ): () => Promise<void> {
    async function setupFn(
      connection: Connection,
    ): Promise<UsersIntegrationExtension> {
      const userModel = connection.model(User.name, UserSchema);

      const messagesProducerService = new MessagesProducerService(
        null as unknown as AmqpConnection,
      );
      jest
        .spyOn(messagesProducerService, 'publishMessage')
        .mockImplementation((_args) => undefined);
      const sendMessageSpy: jest.SpyInstance<void, SendMessageParams> =
        jest.spyOn(messagesProducerService, 'sendMessage');

      const testingConfigService = {
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
      };
      const testJwtService = new JwtService(getTestJwtConfig());

      const testingModule: TestingModule = await Test.createTestingModule({
        imports: [
          JwtModule.registerAsync({
            useFactory: () => testingConfigService.jwtConfig,
          }),
          MongooseModule.forRootAsync({
            useFactory: async () => {
              return testingConfigService.mongooseModuleOptions;
            },
          }),
          MongooseModule.forFeatureAsync([
            {
              name: User.name,
              useFactory: async () => {
                return await usersMongoosePasswordHashMiddleware(
                  testingConfigService as ApplicationConfigService,
                );
              },
            },
          ]),
        ],
        controllers: [UsersController],
        providers: [
          {
            provide: ApplicationConfigService,
            useValue: testingConfigService,
          },
          { provide: APP_GUARD, useClass: JwtAuthGuard },
          JwtStrategy,
          { provide: getModelToken(User.name), useValue: userModel },
          {
            provide: MessagesProducerService,
            useValue: messagesProducerService,
          },
          UsersService,
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
          userModel,
        },
        services: {
          messagesProducerService,
          jwtService: testJwtService,
        },
        sendMessageSpy,
      };
    }

    async function cleanupFn(params: UsersIntegrationExtension) {
      await params.app.close();
    }
    return setupTest<UsersIntegrationExtension>(setupFn, callback, cleanupFn);
  }

  beforeEach(() => fakeTime({ now, fake: ['Date'] }));
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it(
    'finds user without password',
    withTest(async ({ app, models, services }) => {
      const userDtoStub = getCreateUserDtoStub({ username: 'userToFind' });
      const userId = new Types.ObjectId('64747d0909c017917bb7fa70');
      await models.userModel.create({
        ...omit(userDtoStub, 'role'),
        _id: userId,
        roles: userDtoStub.role,
      });
      const userToken = getTestJwtToken(
        {
          roles: [Role.User],
          usr: userDtoStub.username,
          sub: userId.toString(),
        },
        services.jwtService,
      );

      const userOutput = await request(app.getHttpServer())
        .get('/users/64747d0909c017917bb7fa70')
        .set('Authorization', `Bearer ${userToken}`);

      expect(userOutput.body).toEqual<UserOutputDto>({
        id: '64747d0909c017917bb7fa70',
        username: 'userToFind',
        c8yCredentials: {
          password: 'c8y-user',
          username: 'c8y-pass',
          baseAddress: 'https://localhost/',
          tenantID: 'c8y-tenat',
        },
        roles: ['Admin'],
      });
    }),
  );

  it(
    'deletes user',
    withTest(async ({ app, models, services, sendMessageSpy }) => {
      const userDtoStub = getCreateUserDtoStub({ username: 'userToDelete' });
      const userId = new Types.ObjectId('64747f6f00ba8274896f604e');
      await models.userModel.create({
        ...omit(userDtoStub, 'role'),
        _id: userId,
        roles: userDtoStub.role,
      });

      const adminToken = getTestJwtToken(
        {
          roles: [Role.User, Role.Admin],
          usr: userDtoStub.username,
          sub: userId.toString(),
        },
        services.jwtService,
      );

      await request(app.getHttpServer())
        .post('/users/delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: ['64747f6f00ba8274896f604e'] })
        .expect(200)
        .expect({});

      expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
        ExchangeTypes.GENERAL,
        'user.user',
        {
          id: userId.toString(),
          deletedAt: now.toISOString(),
        },
      );
    }),
  );

  it(
    'does not allow user deletion as normal user',
    withTest(async ({ app, models, services, sendMessageSpy }) => {
      const userDtoStub = getCreateUserDtoStub({ username: 'userDeleting123' });
      const user2DtoStub = getCreateUserDtoStub({
        username: 'userToBeDeleted',
      });
      const userId = new Types.ObjectId('6474b8701b7c39b765832cdb');
      const user2Id = new Types.ObjectId('6474b8a2a4a02fc0760fe002');
      await models.userModel.create([
        {
          ...omit(userDtoStub, 'role'),
          _id: userId,
          roles: userDtoStub.role,
        },
        {
          ...omit(user2DtoStub, 'role'),
          _id: user2Id,
          roles: user2DtoStub.role,
        },
      ]);

      const userToken = getTestJwtToken(
        {
          roles: [Role.User],
          usr: userDtoStub.username,
          sub: userId.toString(),
        },
        services.jwtService,
      );

      await request(app.getHttpServer())
        .post('/users/delete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ items: [user2Id.toString()] })
        .expect(403);

      expect(sendMessageSpy).not.toHaveBeenCalled();
    }),
  );

  it(
    'updates user',
    withTest(async ({ app, models, services, sendMessageSpy }) => {
      const userDtoStub = getCreateUserDtoStub({ username: 'userToUpdate' });
      const userId = new Types.ObjectId('6474b99c60930c553352aec0');
      await models.userModel.create({
        ...omit(userDtoStub, 'role'),
        _id: userId,
        roles: userDtoStub.role,
      });
      const adminToken = getTestJwtToken(
        {
          roles: [Role.User, Role.Admin],
          usr: userDtoStub.username,
          sub: userId.toString(),
        },
        services.jwtService,
      );

      const userOutput = await request(app.getHttpServer())
        .patch(`/users/${userId.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ c8yCredentials: { password: 'updated-c8y-user-pass' } });

      expect(userOutput.body).toEqual<UserOutputDto>({
        id: '6474b99c60930c553352aec0',
        username: 'userToUpdate',
        c8yCredentials: {
          password: 'updated-c8y-user-pass',
          username: 'c8y-pass',
          baseAddress: 'https://localhost/',
          tenantID: 'c8y-tenat',
        },
        roles: ['Admin'],
      });

      expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
        ExchangeTypes.GENERAL,
        'user.user',
        {
          id: userId.toString(),
          c8yCredentials: {
            password: 'updated-c8y-user-pass',
            username: 'c8y-pass',
            baseAddress: 'https://localhost/',
            tenantID: 'c8y-tenat',
          },
        },
      );
    }),
  );
});
