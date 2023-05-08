import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { connection } from 'mongoose';
import { User } from '../../../models';
import { UserSchema } from '../../../models/User';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { BadRequestException } from '@nestjs/common';
import { clearCollections } from '../../../utils/tests';
import { Role } from '../../../global/types/roles';
import * as bcrypt from 'bcrypt';
import { MessagesProducerService } from '../../messages/messages-producer.service';
import { omit } from '../../../utils/helpers';
import { SendMessageParams } from '../../messages/types/producer';
import { ExchangeTypes } from '../../messages/types/exchanges';
import { DefaultUserType } from '../../application-config/types/types';
import { ApplicationConfigService } from '../../application-config/application-config.service';

describe('AuthService', () => {
  let service: AuthService;

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
  const defaultUser: DefaultUserType = {
    username: 'test-default-user',
    password: 'default-pass',
    roles: [Role.Admin, Role.User],
    c8yCredentials: {
      password: '123',
      username: 'user',
      baseAddress: 'http://localhost/',
      tenantID: 'tenant',
    },
  };
  const mockConfigService = {
    get defaultUser() {
      return defaultUser;
    },
  };

  const messageProducerService = new MessagesProducerService(null);
  const sendMessageSpy: jest.SpyInstance<void, SendMessageParams> = jest
    .spyOn(messageProducerService, 'sendMessage')
    .mockImplementation((_args) => undefined);

  const userModel = connection.model(User.name, UserSchema);

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: MessagesProducerService, useValue: messageProducerService },
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

    service = module.get<AuthService>(AuthService);
  });

  beforeEach(() => jest.clearAllMocks());
  afterEach(clearCollections(connection));

  it('handles user registration', async () => {
    const userDto = getCreateUserDto('eNtEa');
    const registeredUser = await service.register(userDto);
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
  });

  it('does not allow multiple users with the same username', async () => {
    const userDto = getCreateUserDto('inIcaNkE');
    await service.register(userDto);

    await expect(service.register(userDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('handles user login', async () => {
    const userDto = getCreateUserDto('Olitylea');
    const loginResponse = service.login({
      username: userDto.username,
      roles: [Role.Admin, Role.User],
      _id: '123',
    });

    expect(loginResponse).toEqual({
      access_token: expect.any(String),
    });
  });

  it('validates user', async () => {
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
  });

  it('creates default user', async () => {
    await service.onModuleInit();
    const createdUser = await userModel.findOne({
      username: defaultUser.username,
    });

    const leanUser = createdUser.toObject();
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
  });
});
