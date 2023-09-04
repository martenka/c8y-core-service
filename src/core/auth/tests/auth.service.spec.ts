import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { Connection } from 'mongoose';
import { User } from '../../../models';
import { UserModel, UserSchema } from '../../../models/User';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { BadRequestException } from '@nestjs/common';
import { Role } from '../../../global/types/roles';
import * as bcrypt from 'bcrypt';
import { MessagesProducerService } from '../../messages/messages-producer.service';
import { omit } from '../../../utils/helpers';
import { SendMessageParams } from '../../messages/types/producer';
import { ExchangeTypes } from '../../messages/types/exchanges';
import { DefaultUserType } from '../../application-config/types/types';
import { ApplicationConfigService } from '../../application-config/application-config.service';
import {
  setupTest,
  WithServiceSetupTestResult,
} from '../../../../test/setup/setup';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

type AuthServiceExtensions = WithServiceSetupTestResult<{
  models: {
    userModel: UserModel;
  };
  services: {
    messagesProducerService: MessagesProducerService;
    service: AuthService;
  };
  sendMessageSpy: jest.SpyInstance<void, SendMessageParams>;
}>;

describe('AuthService', () => {
  function getCreateUserDto(username: string) {
    return {
      username,
      password: 'testPassword',
      c8yCredentials: {
        password: 'c8y-user',
        username: 'c8y-pass',
        baseAddress: 'https://localhost/',
        tenantID: 'c8y-tenat',
      },
      role: [Role.Admin],
    };
  }
  const getDefaultUser: () => DefaultUserType = () => ({
    username: 'test-default-user',
    password: 'default-pass',
    roles: [Role.Admin, Role.User],
    c8yCredentials: {
      password: '123',
      username: 'user',
      baseAddress: 'http://localhost/',
      tenantID: 'tenant',
    },
  });

  function withTest(
    callback: (params: AuthServiceExtensions) => Promise<void>,
  ): () => Promise<void> {
    async function setupFn(
      connection: Connection,
    ): Promise<AuthServiceExtensions> {
      const mockConfigService = {
        get defaultUser() {
          return getDefaultUser();
        },
      };

      const messagesProducerService = new MessagesProducerService(
        null as unknown as AmqpConnection,
      );
      jest
        .spyOn(messagesProducerService, 'publishMessage')
        .mockImplementation((_args) => undefined);

      const sendMessageSpy: jest.SpyInstance<void, SendMessageParams> =
        jest.spyOn(messagesProducerService, 'sendMessage');

      const userModel = connection.model(User.name, UserSchema);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          { provide: getModelToken(User.name), useValue: userModel },
          {
            provide: MessagesProducerService,
            useValue: messagesProducerService,
          },
          { provide: UsersService, useClass: UsersService },
          {
            provide: JwtService,
            useValue: new JwtService({
              secret: 'TestingKey',
              signOptions: { algorithm: 'HS256' },
              verifyOptions: {
                algorithms: ['HS256'],
              },
            }),
          },
          { provide: ApplicationConfigService, useValue: mockConfigService },
          AuthService,
        ],
      }).compile();

      const service = module.get<AuthService>(AuthService);

      return {
        models: {
          userModel,
        },
        services: {
          service,
          messagesProducerService,
        },
        sendMessageSpy,
      };
    }

    return setupTest<AuthServiceExtensions>(setupFn, callback);
  }

  beforeEach(() => jest.clearAllMocks());

  it.concurrent(
    'handles user registration',
    withTest(async ({ services, sendMessageSpy }) => {
      const userDto = getCreateUserDto('eNtEa');
      const registeredUser = await services.service.register(userDto);
      expect(registeredUser.toObject()).toMatchObject({
        ...omit(userDto, 'role', 'password'),
        roles: [Role.Admin, Role.User],
      });

      expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
        ExchangeTypes.GENERAL,
        'user.user',
        {
          id: registeredUser._id.toString(),
          c8yCredentials: userDto.c8yCredentials,
        },
      );
    }),
  );

  it.concurrent(
    'does not allow multiple users with the same username',
    withTest(async ({ services: { service } }) => {
      const userDto = getCreateUserDto('inIcaNkE');
      await service.register(userDto);

      await expect(service.register(userDto)).rejects.toThrow(
        BadRequestException,
      );
    }),
  );

  it.concurrent(
    'handles user login',
    withTest(async ({ services }) => {
      const userDto = getCreateUserDto('Olitylea');
      const loginResponse = services.service.login({
        username: userDto.username,
        roles: [Role.Admin, Role.User],
        _id: '123',
      });

      expect(loginResponse).toEqual({
        access_token: expect.any(String),
      });
    }),
  );

  it.concurrent(
    'validates user',
    withTest(async ({ services: { service } }) => {
      const userDto = getCreateUserDto('RiNCaTeR');
      const salt = await bcrypt.genSalt(2);
      const hashedPassword = await bcrypt.hash(userDto.password, salt);
      await service.register({
        ...omit(userDto, 'password'),
        password: hashedPassword,
      });
      const validatedUser = await service.validateUser(
        userDto.username,
        userDto.password,
      );

      expect(validatedUser).toMatchObject<Partial<User>>({
        username: userDto.username,
        roles: [Role.Admin, Role.User],
      });
    }),
  );

  it.concurrent(
    'creates default user',
    withTest(async ({ models, services }) => {
      await services.service.onApplicationBootstrap();
      const createdUser = await models.userModel.findOne({
        username: getDefaultUser().username,
      });

      const leanUser = createdUser!.toObject();
      expect(leanUser).toMatchObject({
        username: 'test-default-user',
        roles: [Role.Admin, Role.User],
        c8yCredentials: {
          password: '123',
          username: 'user',
          baseAddress: 'http://localhost/',
          tenantID: 'tenant',
        },
      });
    }),
  );
});
