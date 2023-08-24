import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { Connection } from 'mongoose';
import { User } from '../../../models';
import { UserModel, UserSchema } from '../../../models/User';
import { getModelToken } from '@nestjs/mongoose';
import { MessagesProducerService } from '../../messages/messages-producer.service';
import { CreateUserDto } from '../dto/input/create-user.dto';
import { Role } from '../../../global/types/roles';
import { omit } from '../../../utils/helpers';
import { fakeTime } from '../../../utils/tests';
import { ExchangeTypes } from '../../messages/types/exchanges';
import { SendMessageParams } from '../../messages/types/producer';
import { isPresent } from '../../../utils/validation';
import {
  setupTest,
  WithServiceSetupTestResult,
} from '../../../../test/setup/setup';
import * as assert from 'assert';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

type UsersServiceExtension = WithServiceSetupTestResult<{
  models: {
    userModel: UserModel;
  };
  services: {
    messagesProducerService: MessagesProducerService;
    usersService: UsersService;
  };
}>;

describe('UsersService', () => {
  const now = new Date();

  const userDtos: (() => CreateUserDto)[] = [
    () => ({
      username: 'testUser',
      password: 'testPassword',
      c8yCredentials: {
        password: 'c8y-user',
        username: 'c8y-pass',
        baseAddress: 'https://localhost/',
        tenantID: 'c8y-tenat',
      },
      role: [Role.Admin],
    }),
    () => ({
      username: 'temporaryUser',
      password: 'temporaryPassword',
      c8yCredentials: {
        password: 'temp-pass',
        username: 'temp-user',
        baseAddress: 'https://localhost/',
        tenantID: 'temp-tenant',
      },
    }),
  ];

  function withTest(
    callback: (params: UsersServiceExtension) => Promise<void>,
  ): () => Promise<void> {
    async function setupFn(
      connection: Connection,
    ): Promise<UsersServiceExtension> {
      const userModel = connection.model(User.name, UserSchema);
      const messagesProducerService = new MessagesProducerService(
        null as unknown as AmqpConnection,
      );

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          { provide: getModelToken(User.name), useValue: userModel },
          {
            provide: MessagesProducerService,
            useValue: messagesProducerService,
          },
          UsersService,
        ],
      }).compile();

      const service = module.get<UsersService>(UsersService);

      return {
        models: {
          userModel,
        },
        services: {
          usersService: service,
          messagesProducerService,
        },
      };
    }

    return setupTest<UsersServiceExtension>(setupFn, callback);
  }

  beforeAll(() => fakeTime({ now, fake: ['Date'] }));
  afterEach(async () => {
    jest.clearAllMocks();
  });
  afterAll(jest.useRealTimers);

  it.concurrent(
    'handles user creation',
    withTest(async ({ services }) => {
      const user = userDtos[0]();
      const registeredUser = await services.usersService.create(user);
      const leanUser = registeredUser!.toObject();

      expect(leanUser.password).toBeUndefined();
      expect(registeredUser!.toObject()).toMatchObject({
        ...omit(userDtos[0](), 'role', 'password'),
        roles: [Role.Admin, Role.User],
      });
    }),
  );

  it.concurrent(
    'finds a user',
    withTest(async ({ models, services }) => {
      const users = userDtos.map((dtoFn) => dtoFn());
      users[0].username = 'testUser2';
      users[1].username = 'testUser3';

      const createdUsers = await models.userModel.create(users);
      const userToFind = createdUsers.find(
        (user) => user.username === 'testUser2',
      );

      assert.ok(isPresent(userToFind));
      const foundUser = await services.usersService.findOne({
        username: 'testUser2',
        id: userToFind._id,
      });

      assert.ok(isPresent(foundUser));
      const leanUser = foundUser.toObject();
      expect(leanUser.password).toBeUndefined();
      expect(leanUser).toMatchObject({
        ...omit(users[0], 'role', 'password'),
        roles: [Role.User],
      });
    }),
  );

  it.concurrent(
    'selects user with password',
    withTest(async ({ models, services }) => {
      const users = userDtos.map((dtoFn) => dtoFn());
      users[0].username = 'testUser4';
      users[1].username = 'temporaryUser';

      await models.userModel.create(users);
      const foundUser = await services.usersService.findOne(
        { username: 'temporaryUser' },
        true,
      );

      expect(isPresent(foundUser)).toBe(true);
      const leanUser = foundUser?.toObject();

      expect(leanUser?.password).toBeDefined();
      expect(leanUser).toMatchObject({
        ...omit(userDtos[1](), 'role', 'password'),
        roles: [Role.User],
      });
    }),
  );

  it.concurrent(
    'updates user',
    withTest(async ({ models, services }) => {
      const sendMessageSpy = jest
        .spyOn(services.messagesProducerService, 'sendMessage')
        .mockImplementation((_args) => undefined);

      const users = userDtos.map((dtoFn) => dtoFn());
      users[0].username = 'testUser6';
      users[1].username = 'temporaryUser2';

      const createdUsers = await models.userModel.create(users);
      const userToUpdate = createdUsers.find(
        (user) => user.username === users[1].username,
      );

      assert.ok(isPresent(userToUpdate));
      expect(userToUpdate?.roles.includes(Role.Admin)).toBe(false);

      const updatedUser = await services.usersService.updateOne(
        userToUpdate._id,
        {
          role: [Role.Admin],
        },
      );

      expect(updatedUser).toBeDefined();
      assert.ok(isPresent(updatedUser));

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
    }),
  );

  it.concurrent(
    'deletes users',
    withTest(async ({ models, services }) => {
      const sendMessageSpy = jest
        .spyOn(services.messagesProducerService, 'sendMessage')
        .mockImplementation((_args) => undefined);

      const users = userDtos.map((dtoFn) => dtoFn());
      users[0].username = 'abcd';
      users[1].username = 'qwerty';

      const createdUsers = await models.userModel.create(users);
      const deleteResponse = await services.usersService.delete({
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
        models.userModel
          .find({ _id: { $in: createdUsers.map((user) => user._id) } })
          .exec(),
      ).resolves.toHaveLength(0);
    }),
  );
});
