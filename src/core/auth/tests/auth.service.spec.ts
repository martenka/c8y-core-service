import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { connection } from 'mongoose';
import { User } from '../../../models';
import { UserSchema } from '../../../models/User';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { CreateUserDto } from '../../users/dto/input/create-user.dto';
import { BadRequestException } from '@nestjs/common';
import { clearCollections } from '../../../utils/tests';
import { Role } from '../../../global/types/roles';
import * as bcrypt from 'bcrypt';
import { MessagesProducerService } from '../../messages/messages-producer.service';
import { omit } from '../../../utils/helpers';

describe('AuthService', () => {
  let service: AuthService;

  const createUserDto: CreateUserDto = {
    username: 'testUser',
    password: 'testPassword',
    c8yCredentials: {
      password: 'c8y-user',
      username: 'c8y-pass',
      baseAddress: 'https://localhost/',
      tenantID: 'c8y-tenat',
    },
    role: [Role.Admin],
  };

  const userModel = connection.model(User.name, UserSchema);

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: MessagesProducerService, useValue: null },
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
        AuthService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(clearCollections(connection));

  it('handles user registration', async () => {
    const registeredUser = await service.register(createUserDto);
    expect(registeredUser.toObject()).toMatchObject({
      ...omit(createUserDto, 'role'),
      roles: [Role.Admin, Role.User],
    });
  });

  it('does not allow multiple users with the same username', async () => {
    await service.register(createUserDto);

    await expect(service.register(createUserDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('handles user login', async () => {
    const loginResponse = service.login({
      username: createUserDto.username,
      roles: [Role.Admin, Role.User],
      _id: '123',
    });

    expect(loginResponse).toEqual({
      access_token: expect.any(String),
    });
  });

  it('validates user', async () => {
    const salt = await bcrypt.genSalt(2);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);
    await service.register({
      ...omit(createUserDto, 'password'),
      password: hashedPassword,
    });
    const validatedUser = await service.validateUser(
      createUserDto.username,
      createUserDto.password,
    );

    expect(validatedUser).toMatchObject<Partial<User>>({
      username: createUserDto.username,
      roles: [Role.Admin, Role.User],
    });
  });
});
