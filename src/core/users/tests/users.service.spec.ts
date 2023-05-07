import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { connection } from 'mongoose';
import { User } from '../../../models';
import { UserSchema } from '../../../models/User';
import { getModelToken } from '@nestjs/mongoose';
import { MessagesProducerService } from '../../messages/messages-producer.service';
import { CreateUserDto } from '../dto/input/create-user.dto';
import { Role } from '../../../global/types/roles';
import { omit } from '../../../utils/helpers';
import { clearCollections, fakeTime } from '../../../utils/tests';
import { ExchangeTypes } from '../../messages/types/exchanges';
import { SendMessageParams } from '../../messages/types/producer';
import { notNil } from '../../../utils/validation';

describe('UsersService', () => {
  let service: UsersService;
  const now = new Date();

  const userDtos: CreateUserDto[] = [
    {
      username: 'testUser',
      password: 'testPassword',
      c8yCredentials: {
        password: 'c8y-user',
        username: 'c8y-pass',
        baseAddress: 'https://localhost/',
        tenantID: 'c8y-tenat',
      },
      role: [Role.Admin],
    },
    {
      username: 'temporaryUser',
      password: 'temporaryPassword',
      c8yCredentials: {
        password: 'temp-pass',
        username: 'temp-user',
        baseAddress: 'https://localhost/',
        tenantID: 'temp-tenant',
      },
    },
  ];

  const userModel = connection.model(User.name, UserSchema);
  const messageProducerService = new MessagesProducerService(null);
  const sendMessageSpy = jest
    .spyOn(messageProducerService, 'sendMessage')
    .mockImplementation((_args) => undefined);

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: getModelToken(User.name), useValue: userModel },
        {
          provide: MessagesProducerService,
          useValue: messageProducerService,
        },
        UsersService,
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  beforeEach(() => fakeTime({ now, fake: ['Date'] }));
  afterEach(async () => {
    jest.useRealTimers();
    clearCollections(connection);
  });

  it('handles user creation', async () => {
    const registeredUser = await service.create(userDtos[0]);
    const leanUser = registeredUser.toObject();

    expect(leanUser.password).toBeUndefined();
    expect(registeredUser.toObject()).toMatchObject({
      ...omit(userDtos[0], 'role', 'password'),
      roles: [Role.Admin, Role.User],
    });
  });

  it('finds a user', async () => {
    const users = [...userDtos];
    users[0].username = 'testUser2';
    users[1].username = 'testUser3';

    const createdUsers = await userModel.create(users);
    const userToFind = createdUsers.find(
      (user) => user.username === 'testUser2',
    );
    const foundUser = await service.findOne({
      username: 'testUser2',
      id: userToFind._id,
    });

    expect(foundUser).toBeDefined();
    const leanUser = foundUser.toObject();
    expect(leanUser.password).toBeUndefined();
    expect(leanUser).toMatchObject({
      ...omit(userDtos[0], 'role', 'password'),
      roles: [Role.User],
    });
  });

  it('selects user with password', async () => {
    const users = [...userDtos];
    users[0].username = 'testUser4';
    users[1].username = 'temporaryUser';

    await userModel.create(users);
    const foundUser = await service.findOne(
      { username: 'temporaryUser' },
      true,
    );

    expect(notNil(foundUser)).toBe(true);
    const leanUser = foundUser.toObject();
    expect(leanUser.password).toBeDefined();
    expect(leanUser).toMatchObject({
      ...omit(userDtos[1], 'role', 'password'),
      roles: [Role.User],
    });
  });

  it('updates user', async () => {
    const users = [...userDtos];
    users[0].username = 'testUser6';
    users[1].username = 'temporaryUser2';

    const createdUsers = await userModel.create(users);
    const userToUpdate = createdUsers.find(
      (user) => user.username === users[1].username,
    );

    expect(userToUpdate.roles.includes(Role.Admin)).toBe(false);
    const updatedUser = await service.updateOne(userToUpdate._id, {
      role: [Role.Admin],
    });

    expect(updatedUser).toBeDefined();
    const leanUpdatedUser = updatedUser.toObject();
    expect(leanUpdatedUser).toMatchObject({
      ...omit(users[1], 'password'),
      roles: [Role.Admin, Role.User],
    });

    expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
      ExchangeTypes.GENERAL,
      'user.user',
      {
        id: leanUpdatedUser._id.toString(),
        c8yCredentials: leanUpdatedUser.c8yCredentials,
      },
    );
  });

  it('deletes users', async () => {
    const users = [...userDtos];
    users[0].username = 'abcd';
    users[1].username = 'qwerty';

    const createdUsers = await userModel.create(users);
    const deleteResponse = await service.delete({
      items: createdUsers.map((user) => user._id.toString()),
    });

    expect(deleteResponse).toEqual({ deletedCount: 2 });
    expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
      ExchangeTypes.GENERAL,
      'user.user',
      {
        id: createdUsers[0]._id.toString(),
        deletedAt: now.toISOString(),
      },
    );
    expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
      ExchangeTypes.GENERAL,
      'user.user',
      {
        id: createdUsers[1]._id.toString(),
        deletedAt: now.toISOString(),
      },
    );

    await expect(
      userModel
        .find({ _id: { $in: createdUsers.map((user) => user._id) } })
        .exec(),
    ).resolves.toHaveLength(0);
  });
});
