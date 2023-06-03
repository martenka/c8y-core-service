import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { connection, Types } from 'mongoose';
import { Group, Sensor } from '../../../models';

import { clearCollections, fakeTime } from '../../../utils/tests';
import { getModelToken, MongooseModuleOptions } from '@nestjs/mongoose';
import { ApplicationConfigService } from '../../application-config/application-config.service';

import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../../auth/jwt/jwt-auth.guard';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtModuleOptions } from '@nestjs/jwt/dist/interfaces/jwt-module-options.interface';
import { getTestJwtConfig, getTestUser } from '../../../tests/helpers/auth';
import { JwtStrategy } from '../../auth/jwt/jwt.strategy';

import { SensorSchema } from '../../../models/Sensor';
import { getSensorStub } from '../../../tests/stubs/sensor';
import { PagingModule } from '../../paging/paging.module';
import { GroupSchema } from '../../../models/Group';
import { GroupsController } from '../groups.controller';
import { GroupsService } from '../groups.service';
import { getCreateGroupDtoStub } from '../../../tests/stubs/group';
import { notNil } from '../../../utils/validation';
import { OutputGroupDto } from '../dto/output-group.dto';
import { OutputSensorDto } from '../../sensors/dto/output-sensor.dto';
import { Role } from '../../../global/types/roles';

describe('Group integration test', () => {
  let app: INestApplication;
  const now = new Date();

  const sensorModel = connection.model(Sensor.name, SensorSchema);
  const groupModel = connection.model(Group.name, GroupSchema);

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

  beforeAll(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [
        PagingModule,
        JwtModule.registerAsync({
          useFactory: () => testingConfigService.jwtConfig,
        }),
      ],
      controllers: [GroupsController],
      providers: [
        {
          provide: ApplicationConfigService,
          useValue: testingConfigService,
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        JwtStrategy,
        { provide: getModelToken(Sensor.name), useValue: sensorModel },
        { provide: getModelToken(Group.name), useValue: groupModel },
        GroupsService,
      ],
    })
      .setLogger(new Logger())
      .compile();

    app = testingModule.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  beforeEach(() => fakeTime({ now, fake: ['Date'] }));
  afterEach(async () => {
    jest.useRealTimers();
    jest.clearAllMocks();
    clearCollections(connection);
  });

  it('creates a new group', async () => {
    const testUser = getTestUser('cng_user', '647991491581429146966e43', {
      jwtService: testJwtService,
    });

    const sensor1 = getSensorStub({
      _id: new Types.ObjectId('647990b00449e641e1f69eac'),
      managedObjectName: 'GroupSensor5',
      valueFragmentType: 'GSVF1',
    });
    const sensor2 = getSensorStub({
      _id: new Types.ObjectId('647990b82a17fddc176a55f9'),
      managedObjectName: 'GroupSensor6',
      valueFragmentType: 'GSVF2',
    });
    const sensor3 = getSensorStub({
      _id: new Types.ObjectId('647990bb8e4205ae09dcd053'),
      managedObjectName: 'GroupSensor7',
      valueFragmentType: 'GSVF3',
    });

    await groupModel.create({
      _id: new Types.ObjectId('64799c0527047d801cc7dd3f'),
      name: 'Group2',
      sensors: [sensor1._id.toString()],
    });

    const sensors = [sensor1, sensor2, sensor3];
    const createGroupDto = getCreateGroupDtoStub({
      sensors: sensors.map((sensor) => sensor._id?.toString()).filter(notNil),
      groups: ['64799c0527047d801cc7dd3f'],
    });

    await sensorModel.create(sensors);

    const groupOutput = await request(app.getHttpServer())
      .post('/groups')
      .send([createGroupDto])
      .set('Authorization', `Bearer ${testUser.userToken}`);

    expect(groupOutput.status).toEqual(201);
    expect(groupOutput.body).toEqual(
      expect.arrayContaining<Partial<OutputGroupDto>>([
        {
          name: 'Group1',
          id: expect.any(String),
          description: 'Group1 test description',
          sensorAmount: 3,
          groupAmount: 1,
        },
      ]),
    );
  });

  it('gets a specific group', async () => {
    const testUser = getTestUser('cng_user', '64799d2632f1786bed319959', {
      jwtService: testJwtService,
    });

    const sensor1 = getSensorStub({
      _id: new Types.ObjectId('64799d29b73dbb32bc3be21e'),
      managedObjectName: 'GroupSensor5',
      valueFragmentType: 'GSVF1',
    });
    const sensor2 = getSensorStub({
      _id: new Types.ObjectId('64799d2df17a93e3cdd70b1b'),
      managedObjectName: 'GroupSensor6',
      valueFragmentType: 'GSVF2',
    });
    const sensor3 = getSensorStub({
      _id: new Types.ObjectId('64799d2fc1f19eb69d61b023'),
      managedObjectName: 'GroupSensor7',
      valueFragmentType: 'GSVF3',
    });

    const sensors = [sensor1, sensor2, sensor3];
    const createGroupDto = getCreateGroupDtoStub({
      name: 'GetsSpecificGroupName',
      description: 'GetsSpecificGroupName test description',
      sensors: [],
    });

    await groupModel.create({
      _id: new Types.ObjectId('64799f492acb7fe2134fdd17'),
      name: 'ExistingGroup2',
      sensors: [sensor1._id.toString()],
    });

    await sensorModel.create(sensors);
    await groupModel.create({
      ...createGroupDto,
      _id: new Types.ObjectId('64799dc8333c54bda436f06c'),
      sensors: sensors.map((sensor) => sensor._id),
      groups: [new Types.ObjectId('64799f492acb7fe2134fdd17')],
    });

    const groupOutput = await request(app.getHttpServer())
      .get('/groups/64799dc8333c54bda436f06c')
      .set('Authorization', `Bearer ${testUser.userToken}`);

    expect(groupOutput.status).toEqual(200);
    expect(groupOutput.body).toEqual({
      name: 'GetsSpecificGroupName',
      id: expect.any(String),
      description: 'GetsSpecificGroupName test description',
      owner: 'test_owner',
      sensorAmount: 3,
      groupAmount: 1,
      sensors: expect.arrayContaining([
        expect.objectContaining<Partial<OutputSensorDto>>({
          id: '64799d29b73dbb32bc3be21e',
          managedObjectName: 'GroupSensor5',
          valueFragmentType: 'GSVF1',
        }),
        expect.objectContaining<Partial<OutputSensorDto>>({
          id: '64799d2df17a93e3cdd70b1b',
          managedObjectName: 'GroupSensor6',
          valueFragmentType: 'GSVF2',
        }),
        expect.objectContaining<Partial<OutputSensorDto>>({
          id: '64799d2fc1f19eb69d61b023',
          managedObjectName: 'GroupSensor7',
          valueFragmentType: 'GSVF3',
        }),
      ]),
      customAttributes: {
        test: 'value',
      },
    });
  });

  it('searches groups', async () => {
    const testUser = getTestUser('sg_user', '647b1548d11c25a193f435e6', {
      jwtService: testJwtService,
    });

    const sensor1 = getSensorStub({
      _id: new Types.ObjectId('647b154deb774ae534858653'),
      managedObjectName: 'GroupSensor5',
      valueFragmentType: 'GSVF1',
    });
    const sensor2 = getSensorStub({
      _id: new Types.ObjectId('647b15550c5cdb74dad59a17'),
      managedObjectName: 'GroupSensor6',
      valueFragmentType: 'GSVF2',
    });
    const sensor3 = getSensorStub({
      _id: new Types.ObjectId('647b1558671ae3f4b6ebe428'),
      managedObjectName: 'GroupSensor7',
      valueFragmentType: 'GSVF3',
    });

    const sensors = [sensor1, sensor2, sensor3];
    await sensorModel.create(sensors);

    const createGroupDto = getCreateGroupDtoStub({
      name: 'SearchesGroupsName',
      description: 'Test description',
      sensors: [],
    });

    await groupModel.create([
      {
        ...createGroupDto,
        _id: new Types.ObjectId('647b155e87bf36a3178eaf26'),
        sensors: sensors.map((sensor) => sensor._id),
      },
      {
        _id: new Types.ObjectId('647b15614210c062490d110a'),
        name: 'SEARCHES_GROUPSNAME',
        sensors: [],
      },
      {
        _id: new Types.ObjectId('647b156562e31e2f01ca8e37'),
        name: 'Name123',
        sensors: [],
      },
    ]);

    const groupOutput = await request(app.getHttpServer())
      .get('/groups/search?name=searches&searchType=prefix')
      .set('Authorization', `Bearer ${testUser.userToken}`);

    expect(groupOutput.status).toEqual(200);
    expect(groupOutput.body).toEqual({
      pageInfo: expect.objectContaining({
        pageSize: 10,
        currentPage: 1,
      }),
      data: expect.arrayContaining([
        expect.objectContaining({
          id: '647b155e87bf36a3178eaf26',
          sensorAmount: 3,
          name: 'SearchesGroupsName',
        }),
        expect.objectContaining({
          id: '647b15614210c062490d110a',
          sensorAmount: 0,
          name: 'SEARCHES_GROUPSNAME',
        }),
      ]),
    });
  });

  it('deletes a group while preserving sensors', async () => {
    const testUser = getTestUser('cng_user', '647991491581429146966e43', {
      jwtService: testJwtService,
    });

    const sensor1 = getSensorStub({
      _id: new Types.ObjectId('6479dea424b3cbc8d18af1aa'),
      managedObjectName: 'GroupSensor5',
      valueFragmentType: 'GSVF1',
    });
    const sensor2 = getSensorStub({
      _id: new Types.ObjectId('6479dea81c1dece5ba861092'),
      managedObjectName: 'GroupSensor6',
      valueFragmentType: 'GSVF2',
    });
    const sensor3 = getSensorStub({
      _id: new Types.ObjectId('6479deacaae66bfc5a4c94c5'),
      managedObjectName: 'GroupSensor7',
      valueFragmentType: 'GSVF3',
    });

    const sensors = [sensor1, sensor2, sensor3];
    const createGroupDto = getCreateGroupDtoStub({
      name: 'GroupToBeDeletedName',
      sensors: sensors.map((sensor) => sensor._id?.toString()).filter(notNil),
    });

    await sensorModel.create(sensors);

    await groupModel.create({
      ...createGroupDto,
      _id: new Types.ObjectId('6479deec547ccbbb76ea4482'),
    });
    const groupOutput = await request(app.getHttpServer())
      .delete('/groups/6479deec547ccbbb76ea4482')
      .set('Authorization', `Bearer ${testUser.userToken}`);

    expect(groupOutput.status).toEqual(200);
    expect(groupOutput.body).toEqual({});
    expect(
      await sensorModel.countDocuments({
        _id: { $in: sensors.map((sensor) => sensor._id) },
      }),
    ).toEqual(3);
  });

  it('does not allow deleting of group with normal user account', async () => {
    const testUser = getTestUser('dnadnu_user', '647b132c8bab7f3d59a98366', {
      jwtService: testJwtService,
      roles: [Role.User],
    });

    await groupModel.create([
      {
        _id: new Types.ObjectId('647b132c8bab7f3d59a98366'),
        name: 'GN1',
        sensors: [],
      },
      {
        _id: new Types.ObjectId('647b1345d7e9921bb389400d'),
        name: 'GN2',
        sensors: [],
      },
      {
        _id: new Types.ObjectId('647b1349972f94c73dc8ccc8'),
        name: 'GN3',
        sensors: [],
      },
    ]);

    const groupOutput = await request(app.getHttpServer())
      .delete('/groups/647b1345d7e9921bb389400d')
      .set('Authorization', `Bearer ${testUser.userToken}`);

    expect(groupOutput.status).toEqual(403);
    expect(groupOutput.body).toMatchObject({
      message: 'Forbidden resource',
    });
  });

  it('updates group', async () => {
    const testUser = getTestUser('cng_user', '6479e91197deeac546566d7d', {
      jwtService: testJwtService,
    });

    const sensor1 = getSensorStub({
      _id: new Types.ObjectId('6479e900b37aec05d4f70f56'),
      managedObjectName: 'GroupSensor15',
      valueFragmentType: 'GSVF15',
    });
    const sensor2 = getSensorStub({
      _id: new Types.ObjectId('6479e9033521517917bc811f'),
      managedObjectName: 'GroupSensor16',
      valueFragmentType: 'GSVF16',
    });
    const sensor3 = getSensorStub({
      _id: new Types.ObjectId('6479e906e6d55a9430db1c3a'),
      managedObjectName: 'GroupSensor17',
      valueFragmentType: 'GSVF17',
    });

    const sensors = [sensor1, sensor2];
    const createGroupDto = getCreateGroupDtoStub({
      name: 'OriginalGroupToBeUpdatedName',
      sensors: sensors.map((sensor) => sensor._id?.toString()).filter(notNil),
    });

    await sensorModel.create([...sensors, sensor3]);

    const groupEntity = await groupModel.create({
      ...createGroupDto,
      _id: new Types.ObjectId('6479e95b3e396416b6144b74'),
    });
    const groupOutput = await request(app.getHttpServer())
      .patch('/groups')
      .send([
        {
          id: '6479e95b3e396416b6144b74',
          sensors: ['6479e906e6d55a9430db1c3a'],
          name: 'UpdatedGroupName',
        },
      ])
      .set('Authorization', `Bearer ${testUser.userToken}`);

    expect(groupEntity.sensorAmount).toEqual(2);
    expect(groupEntity.name).toEqual('OriginalGroupToBeUpdatedName');

    expect(groupOutput.status).toEqual(200);
    expect(groupOutput.body).toEqual([
      expect.objectContaining({
        name: 'UpdatedGroupName',
        sensorAmount: 3,
      }),
    ]);
  });
});
