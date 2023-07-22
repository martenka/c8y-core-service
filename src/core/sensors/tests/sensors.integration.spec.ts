import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { Connection, Types } from 'mongoose';
import { Sensor } from '../../../models';

import { fakeTime } from '../../../utils/tests';
import { getModelToken, MongooseModuleOptions } from '@nestjs/mongoose';
import { ApplicationConfigService } from '../../application-config/application-config.service';
import { getCreateUserDtoStub } from '../../../tests/stubs/user';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../../auth/jwt/jwt-auth.guard';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtModuleOptions } from '@nestjs/jwt/dist/interfaces/jwt-module-options.interface';
import {
  getTestJwtConfig,
  getTestJwtToken,
  getTestUser,
} from '../../../tests/helpers/auth';
import { JwtStrategy } from '../../auth/jwt/jwt.strategy';
import { Role } from '../../../global/types/roles';
import { SensorModel, SensorSchema } from '../../../models/Sensor';
import { SensorsController } from '../sensors.controller';
import { SensorsService } from '../sensors.service';
import { OutputSensorDto } from '../dto/output-sensor.dto';
import {
  getCreateSensorDtoStub,
  getSensorStub,
} from '../../../tests/stubs/sensor';
import { PagingModule } from '../../paging/paging.module';
import {
  setupTest,
  WithIntegrationSetupTestResult,
} from '../../../../test/setup/setup';

type SensorsIntegrationExtension = WithIntegrationSetupTestResult<{
  models: {
    sensorModel: SensorModel;
  };
  services: {
    jwtService: JwtService;
  };
}>;

describe('Sensors integration test', () => {
  const now = new Date();

  beforeEach(() => fakeTime({ now, fake: ['Date'] }));
  afterEach(async () => {
    jest.useRealTimers();
  });

  function withTest(
    callback: (params: SensorsIntegrationExtension) => Promise<void>,
  ): () => Promise<void> {
    async function setupFn(
      connection: Connection,
    ): Promise<SensorsIntegrationExtension> {
      const sensorModel = connection.model(Sensor.name, SensorSchema);

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
          PagingModule,
          JwtModule.registerAsync({
            useFactory: () => testingConfigService.jwtConfig,
          }),
        ],
        controllers: [SensorsController],
        providers: [
          {
            provide: ApplicationConfigService,
            useValue: testingConfigService,
          },
          { provide: APP_GUARD, useClass: JwtAuthGuard },
          JwtStrategy,
          { provide: getModelToken(Sensor.name), useValue: sensorModel },
          SensorsService,
        ],
      }).compile();

      const app = testingModule.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await app.init();

      return {
        app,
        models: {
          sensorModel,
        },
        services: {
          jwtService: testJwtService,
        },
      };
    }

    return setupTest<SensorsIntegrationExtension>(setupFn, callback);
  }

  it.concurrent(
    'gets specific sensor',
    withTest(async ({ app, models, services }) => {
      const userDtoStub = getCreateUserDtoStub({ username: 'gss_user' });
      const userId = new Types.ObjectId('6474fc9782c5891dc1cf587c');
      await models.sensorModel.create({
        ...getCreateSensorDtoStub(),
        _id: new Types.ObjectId('6474fd18776e8e910756f1ea'),
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
        .get('/sensors/6474fd18776e8e910756f1ea')
        .set('Authorization', `Bearer ${userToken}`);

      expect(userOutput.body).toEqual<OutputSensorDto>({
        id: '6474fd18776e8e910756f1ea',
        managedObjectId: '980',
        managedObjectName: "AC01'Wall'BB5",
        valueFragmentType: 'TMP',
        valueFragmentDisplayName: 'Temperature',
        type: 'TEST_TYPE',
        owner: 'TEST_OWNER',
        description: 'TEST_DESCRIPTION',
        customAttributes: {
          test: 'value',
        },
      });
    }),
  );

  it.concurrent(
    'creates new sensors',
    withTest(async ({ app, models, services }) => {
      const userDtoStub = getCreateUserDtoStub({ username: 'gss_user' });
      const userId = new Types.ObjectId('6474fc9782c5891dc1cf587c');
      await models.sensorModel.create({
        ...getCreateSensorDtoStub(),
        _id: new Types.ObjectId('6475076d3a557602aafbbbc2'),
      });
      const userToken = getTestJwtToken(
        {
          roles: [Role.User, Role.Admin],
          usr: userDtoStub.username,
          sub: userId.toString(),
        },
        services.jwtService,
      );

      const createSensorDtos = [
        getCreateSensorDtoStub({
          managedObjectId: '678',
          managedObjectName: 'Sensor678',
          customAttributes: undefined,
        }),
        getCreateSensorDtoStub({
          managedObjectId: '989',
          managedObjectName: "AC02'Ceil'KJL3124",
          valueFragmentType: 'CO2',
          valueFragmentDisplayName: 'CO2',
          description: 'Carbon dioxide',
          customAttributes: {
            location: 'room123',
          },
        }),
      ];

      const sensorResponse = await request(app.getHttpServer())
        .post('/sensors/')
        .send(createSensorDtos)
        .set('Authorization', `Bearer ${userToken}`);

      expect(sensorResponse.body).toEqual<[OutputSensorDto]>(
        expect.arrayContaining([
          {
            id: expect.any(String),
            managedObjectId: '678',
            managedObjectName: 'Sensor678',
            valueFragmentType: 'TMP',
            valueFragmentDisplayName: 'Temperature',
            type: 'TEST_TYPE',
            owner: 'TEST_OWNER',
            description: 'TEST_DESCRIPTION',
          },
          {
            id: expect.any(String),
            managedObjectId: '989',
            managedObjectName: "AC02'Ceil'KJL3124",
            valueFragmentType: 'CO2',
            valueFragmentDisplayName: 'CO2',
            description: 'Carbon dioxide',
            type: 'TEST_TYPE',
            owner: 'TEST_OWNER',
            customAttributes: {
              location: 'room123',
            },
          },
        ]),
      );
    }),
  );

  it.concurrent(
    'deletes a sensor',
    withTest(async ({ app, models, services }) => {
      const userDtoStub = getCreateUserDtoStub({ username: 'gss_user' });
      const userId = new Types.ObjectId('6477a5ece2cd5f3fefc2091f');
      await models.sensorModel.create({
        ...getCreateSensorDtoStub(),
        _id: new Types.ObjectId('6477a5f0744868c07d5e4b30'),
      });
      const userToken = getTestJwtToken(
        {
          roles: [Role.User, Role.Admin],
          usr: userDtoStub.username,
          sub: userId.toString(),
        },
        services.jwtService,
      );
      const sensor1Id = new Types.ObjectId('6477a6362ec31853a0575707');
      const sensor3Id = new Types.ObjectId('6477a662efd676a041ea0b5c');

      await models.sensorModel.create([
        getSensorStub({
          _id: sensor1Id,
          managedObjectId: '32423',
        }),
        getSensorStub({
          _id: new Types.ObjectId('6477a65f4766122bb0f55454'),
          managedObjectId: '5243523',
        }),
        getSensorStub({
          _id: sensor3Id,
          managedObjectId: '23523412',
        }),
      ]);

      const sensorResponse = await request(app.getHttpServer())
        .delete('/sensors/6477a65f4766122bb0f55454')
        .set('Authorization', `Bearer ${userToken}`);

      expect(sensorResponse.status).toEqual(200);
      expect(sensorResponse.body).toEqual({});
      expect(
        await models.sensorModel.countDocuments({
          _id: { $in: [sensor1Id, sensor3Id] },
        }),
      ).toEqual(2);
    }),
  );

  it.concurrent(
    'searches sensors by PREFIX search',
    withTest(async ({ app, models, services }) => {
      const testUser = getTestUser(
        'searches_sensors_user',
        '6477aa5b4e4427775c545e43',
        { jwtService: services.jwtService },
      );

      await models.sensorModel.create({
        ...getCreateSensorDtoStub(),
        _id: new Types.ObjectId('6477aa607e8250fd678e7e3d'),
      });

      const sensor1Id = new Types.ObjectId('6477aa67a8ba8f385da04268');
      const sensor2Id = new Types.ObjectId('6477aa7748442002a33ffd88');
      const sensor3Id = new Types.ObjectId('6477aa70af01fa8e29969a9c');

      await models.sensorModel.create([
        getSensorStub({
          _id: sensor1Id,
          managedObjectId: '4987098763',
          managedObjectName: "ABC'DERT'ae23",
          valueFragmentDisplayName: 'CO2',
        }),
        getSensorStub({
          _id: sensor2Id,
          managedObjectId: '13451235',
          managedObjectName: 'CAPITAL_LETTERS_NAME',
          valueFragmentDisplayName: 'Temperature',
          valueFragmentType: 'TmP',
        }),
        getSensorStub({
          _id: sensor3Id,
          managedObjectId: '762831712345',
          valueFragmentType: 'TMP',
        }),
      ]);

      const sensorResponse = await request(app.getHttpServer())
        .get('/sensors/search')
        .query({ valueFragmentType: 'tmp' })
        .set('Authorization', `Bearer ${testUser.userToken}`);

      expect(sensorResponse.status).toEqual(200);
      expect(sensorResponse.body).toEqual({
        pageInfo: { pageSize: 10, currentPage: 1 },
        data: expect.arrayContaining([
          expect.objectContaining({
            id: sensor2Id.toString(),
            managedObjectId: '13451235',
            managedObjectName: 'CAPITAL_LETTERS_NAME',
            valueFragmentDisplayName: 'Temperature',
            valueFragmentType: 'TmP',
          }),
          expect.objectContaining({
            id: sensor3Id.toString(),
            managedObjectId: '762831712345',
            valueFragmentType: 'TMP',
          }),
        ]),
      });
    }),
  );

  it.concurrent(
    'searches sensors by EXACT search',
    withTest(async ({ app, models, services }) => {
      const testUser = getTestUser(
        'searches_sensors_exact_user',
        '64789880ee2c7d24dcb48cc1',
        { jwtService: services.jwtService },
      );

      await models.sensorModel.create({
        ...getCreateSensorDtoStub(),
        _id: new Types.ObjectId('647898907b2924e9fea82eb5'),
      });

      const sensor1Id = new Types.ObjectId('64788bfe89e53c9e25d6cbed');
      const sensor2Id = new Types.ObjectId('6478989b2b16332da3207676');
      const sensor3Id = new Types.ObjectId('6478989f237339cd7b53c8b6');

      await models.sensorModel.create([
        getSensorStub({
          _id: sensor1Id,
          managedObjectId: '4987098763',
          managedObjectName: "ABC'DERT'ae23",
          valueFragmentDisplayName: 'CO2',
        }),
        getSensorStub({
          _id: sensor2Id,
          managedObjectId: '23589289',
          managedObjectName: 'CAPITAL_LETTERS_NAME123',
          valueFragmentDisplayName: 'Temperature',
          valueFragmentType: 'TemP',
        }),
        getSensorStub({
          _id: sensor3Id,
          managedObjectId: '762831712345',
          valueFragmentType: 'TEMP',
        }),
      ]);

      const sensorResponse = await request(app.getHttpServer())
        .get('/sensors/search')
        .query({ valueFragmentType: 'TEmP' })
        .set('Authorization', `Bearer ${testUser.userToken}`);

      expect(sensorResponse.status).toEqual(200);
      expect(sensorResponse.body).toEqual({
        pageInfo: { pageSize: 10, currentPage: 1 },
        data: expect.arrayContaining([
          expect.objectContaining({
            id: sensor2Id.toString(),
            managedObjectId: '23589289',
            managedObjectName: 'CAPITAL_LETTERS_NAME123',
            valueFragmentDisplayName: 'Temperature',
            valueFragmentType: 'TemP',
          }),
        ]),
      });
    }),
  );

  it.concurrent(
    'updates one sensor',
    withTest(async ({ app, models, services }) => {
      const sensorStub = getCreateSensorDtoStub();
      const sensorEntity = await models.sensorModel.create({
        ...sensorStub,
        _id: new Types.ObjectId('64788bfe89e53c9e25d6cbed'),
      });
      const originalLeanSensorEntity = sensorEntity.toObject();

      const user = getTestUser('us_user', '64788c3feffcb1dd162c0b49', {
        jwtService: services.jwtService,
      });

      const sensorResponse = await request(app.getHttpServer())
        .patch('/sensors/64788bfe89e53c9e25d6cbed')
        .send({
          description: 'UpdatedDescription',
          valueFragmentDisplayName: 'UpdatedFragmentDisplayName',
          customAttributes: { updatedKey: 'updatedValue' },
        })
        .set('Authorization', `Bearer ${user.userToken}`);

      expect(originalLeanSensorEntity).toMatchObject({
        _id: '64788bfe89e53c9e25d6cbed',
        managedObjectId: '980',
        managedObjectName: "AC01'Wall'BB5",
        valueFragmentType: 'TMP',
        valueFragmentDisplayName: 'Temperature',
        description: 'TEST_DESCRIPTION',
        customAttributes: {
          test: 'value',
        },
      });
      expect(sensorResponse.status).toEqual(200);
      expect(sensorResponse.body).toMatchObject({
        id: '64788bfe89e53c9e25d6cbed',
        managedObjectId: '980',
        managedObjectName: "AC01'Wall'BB5",
        valueFragmentType: 'TMP',
        description: 'UpdatedDescription',
        valueFragmentDisplayName: 'UpdatedFragmentDisplayName',
        customAttributes: { updatedKey: 'updatedValue' },
      });
    }),
  );

  it.concurrent(
    'returns 400 when updating one sensor input does not match specification',
    withTest(async ({ app, models, services }) => {
      const sensorStub = getCreateSensorDtoStub();
      await models.sensorModel.create({
        ...sensorStub,
        _id: new Types.ObjectId('6478e2ff33c710828183322f'),
      });

      const user = getTestUser('us_user', '6478e304b52fc80cc17ef8eb', {
        jwtService: services.jwtService,
      });

      const sensorResponse = await request(app.getHttpServer())
        .patch('/sensors/6478e2ff33c710828183322f')
        .send({
          description: { test: 'value' },
          valueFragmentDisplayName: 'UpdatedFragmentDisplayName',
          customAttributes: "{ updatedKey: 'updatedValue' }",
          should: 'not be present',
        })
        .set('Authorization', `Bearer ${user.userToken}`);

      expect(sensorResponse.status).toEqual(400);
    }),
  );

  it.concurrent(
    'updates multiple sensors',
    withTest(async ({ app, models, services }) => {
      const sensorEntities = await models.sensorModel.create([
        {
          ...getCreateSensorDtoStub(),
          _id: new Types.ObjectId('64788f70fccb936c4d76caaf'),
        },
        {
          ...getCreateSensorDtoStub({
            managedObjectName: 'TestManagedObjectName',
          }),
          _id: new Types.ObjectId('64788fd8581acf2821427f2f'),
        },
      ]);
      const originalLeanSensorEntity = sensorEntities[0].toObject();

      const user = getTestUser('ums_user', '64788f7a02866bef443c3db9', {
        jwtService: services.jwtService,
      });

      const sensorResponse = await request(app.getHttpServer())
        .patch('/sensors')
        .send([
          {
            id: '64788f70fccb936c4d76caaf',
            description: 'UpdatedDescription',
            valueFragmentDisplayName: 'UpdatedFragmentDisplayName',
            customAttributes: { updatedKey: 'updatedValue' },
          },
          {
            id: '64788fd8581acf2821427f2f',
            description: 'AnotherUpdatedDescription',
            valueFragmentDisplayName: 'Type1',
            managedObjectName: 'UpdatedManagedObjectName',
            customAttributes: { attribute: 'value1' },
          },
        ])
        .set('Authorization', `Bearer ${user.userToken}`);

      expect(originalLeanSensorEntity).toMatchObject({
        _id: '64788f70fccb936c4d76caaf',
        managedObjectId: '980',
        managedObjectName: "AC01'Wall'BB5",
        valueFragmentType: 'TMP',
        valueFragmentDisplayName: 'Temperature',
        description: 'TEST_DESCRIPTION',
        customAttributes: {
          test: 'value',
        },
      });

      expect(sensorResponse.status).toEqual(200);
      expect(sensorResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: '64788f70fccb936c4d76caaf',
            managedObjectId: '980',
            managedObjectName: "AC01'Wall'BB5",
            valueFragmentType: 'TMP',
            description: 'UpdatedDescription',
            valueFragmentDisplayName: 'UpdatedFragmentDisplayName',
            customAttributes: { test: 'value', updatedKey: 'updatedValue' },
          }),
          expect.objectContaining({
            id: '64788fd8581acf2821427f2f',
            managedObjectId: '980',
            managedObjectName: 'UpdatedManagedObjectName',
            valueFragmentType: 'TMP',
            description: 'AnotherUpdatedDescription',
            valueFragmentDisplayName: 'Type1',
            customAttributes: { test: 'value', attribute: 'value1' },
          }),
        ]),
      );
    }),
  );

  it.concurrent(
    'updates multiple sensors custom attributes by common valueFragmentType',
    withTest(async ({ app, models, services }) => {
      const sensorEntities = await models.sensorModel.create([
        {
          ...getCreateSensorDtoStub(),
          _id: new Types.ObjectId('649e9407d3169338fd07a4cc'),
          valueFragmentType: 'CommonIdentifierType',
        },
        {
          ...getCreateSensorDtoStub({
            managedObjectName: 'TestName2',
            valueFragmentType: 'CommonIdentifierType',
          }),
          _id: new Types.ObjectId('649e943ec09fcdde931d5944'),
        },
        {
          ...getCreateSensorDtoStub({
            managedObjectName: 'TestName3',
            valueFragmentType: 'SomeOtherIdentifierType',
          }),
          _id: new Types.ObjectId('649e94456b2900d8d5284306'),
        },
      ]);

      const user = getTestUser('umsbca_user', '649e94571f4308695805fd60', {
        jwtService: services.jwtService,
      });

      const sensorResponse = await request(app.getHttpServer())
        .patch('/sensors/attributes')
        .send({
          identifiers: { valueFragmentType: 'CommonIdentifierType' },
          customAttributes: {
            addedKey: 'addedValue',
            nestedObj: { nestedKey: 1 },
          },
          description: 'Added description',
        })
        .set('Authorization', `Bearer ${user.userToken}`);

      expect(sensorResponse.status).toEqual(200);
      const updatedSensors = await models.sensorModel
        .find({
          _id: { $in: sensorEntities.map((entity) => entity._id) },
        })
        .exec();

      expect(updatedSensors.map((sensor) => sensor.toObject())).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            _id: '649e9407d3169338fd07a4cc',
            valueFragmentType: 'CommonIdentifierType',
            customAttributes: {
              addedKey: 'addedValue',
              test: 'value',
            },
            description: 'Added description',
          }),
          expect.objectContaining({
            _id: '649e943ec09fcdde931d5944',
            valueFragmentType: 'CommonIdentifierType',
            customAttributes: {
              addedKey: 'addedValue',
              test: 'value',
            },
            description: 'Added description',
          }),
          expect.objectContaining({
            _id: '649e94456b2900d8d5284306',
            valueFragmentType: 'SomeOtherIdentifierType',
            customAttributes: {
              test: 'value',
            },
            description: 'TEST_DESCRIPTION',
          }),
        ]),
      );
    }),
  );

  it.concurrent(
    'does not allow update by common identifiers if non are specified',
    withTest(async ({ app, models, services }) => {
      const sensorEntities = await models.sensorModel.create([
        {
          ...getCreateSensorDtoStub(),
          _id: new Types.ObjectId('649e9df33faf6bc46aded047'),
          valueFragmentType: 'CommonIdentifierType',
        },
        {
          ...getCreateSensorDtoStub({
            managedObjectName: 'TestName6',
            valueFragmentType: 'CommonIdentifierType',
          }),
          _id: new Types.ObjectId('649e9df8d3aca61e44bb2b92'),
        },
        {
          ...getCreateSensorDtoStub({
            managedObjectName: 'TestName9',
            valueFragmentType: 'SomeOtherIdentifierType',
          }),
          _id: new Types.ObjectId('649e9dfcc0c75990d351f01c'),
        },
      ]);

      const user = getTestUser('dnaumsbca_user', '649e9e05cce89a4fcf1281c3', {
        jwtService: services.jwtService,
      });

      const sensorResponse = await request(app.getHttpServer())
        .patch('/sensors/common-identifiers')
        .send({
          identifiers: {},
          customAttributes: {
            addedKey: 'addedValue',
            nestedObj: { nestedKey: 1 },
          },
          description: 'Added description',
        })
        .set('Authorization', `Bearer ${user.userToken}`);

      expect(sensorResponse.status).toEqual(400);
      const updatedSensors = await models.sensorModel
        .find({
          _id: { $in: sensorEntities.map((entity) => entity._id) },
        })
        .exec();

      expect(updatedSensors.map((sensor) => sensor.toObject())).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            _id: '649e9df33faf6bc46aded047',
            valueFragmentType: 'CommonIdentifierType',
            customAttributes: {
              test: 'value',
            },
            description: 'TEST_DESCRIPTION',
          }),
          expect.objectContaining({
            _id: '649e9df8d3aca61e44bb2b92',
            valueFragmentType: 'CommonIdentifierType',
            customAttributes: {
              test: 'value',
            },
            description: 'TEST_DESCRIPTION',
          }),
          expect.objectContaining({
            _id: '649e9dfcc0c75990d351f01c',
            valueFragmentType: 'SomeOtherIdentifierType',
            customAttributes: {
              test: 'value',
            },
            description: 'TEST_DESCRIPTION',
          }),
        ]),
      );
    }),
  );

  it.concurrent(
    'removes attributes from sensors identified by common identifier',
    withTest(async ({ app, models, services }) => {
      const sensorEntities = await models.sensorModel.create([
        {
          ...getCreateSensorDtoStub(),
          _id: new Types.ObjectId('649ee521248336a6671375ac'),
          valueFragmentType: 'CommonIdentifierType',
          customAttributes: {
            test: 'value',
            valueToRemove2: '234',
          },
        },
        {
          ...getCreateSensorDtoStub({
            managedObjectName: 'TestName7',
            valueFragmentType: 'CommonIdentifierType',
            customAttributes: {
              test: 'value',
              valueToRemove: '123',
            },
          }),
          _id: new Types.ObjectId('649ee558e42d61df2c76ab04'),
        },
        {
          ...getCreateSensorDtoStub({
            managedObjectName: 'TestName8',
            valueFragmentType: 'SomeOtherIdentifierType',
          }),
          _id: new Types.ObjectId('649ee55df7432731ed191ca9'),
        },
      ]);

      const user = getTestUser('raumsbca_user', '649ee56b61bb35f9fa4c9a0d', {
        jwtService: services.jwtService,
      });

      const sensorResponse = await request(app.getHttpServer())
        .post('/sensors/attributes/delete')
        .send({
          identifiers: { valueFragmentType: 'CommonIdentifierType' },
          customAttributeKeys: ['test', 'notExistingKey'],
          description: true,
          notExisting: 'value',
        })
        .set('Authorization', `Bearer ${user.userToken}`);

      expect(sensorResponse.status).toEqual(200);
      const updatedSensors = await models.sensorModel
        .find({
          _id: { $in: sensorEntities.map((entity) => entity._id) },
        })
        .exec();

      expect(updatedSensors.map((sensor) => sensor.toObject())).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            _id: '649ee521248336a6671375ac',
            valueFragmentType: 'CommonIdentifierType',
            customAttributes: { valueToRemove2: '234' },
            valueFragmentDisplayName: 'Temperature',
          }),
          expect.objectContaining({
            _id: '649ee558e42d61df2c76ab04',
            valueFragmentType: 'CommonIdentifierType',
            customAttributes: {
              valueToRemove: '123',
            },
            valueFragmentDisplayName: 'Temperature',
          }),
          expect.objectContaining({
            _id: '649ee55df7432731ed191ca9',
            valueFragmentType: 'SomeOtherIdentifierType',
            customAttributes: {
              test: 'value',
            },
            valueFragmentDisplayName: 'Temperature',
          }),
        ]),
      );
    }),
  );

  it.concurrent(
    'returns 400 when updating many sensors input does not match specification',
    withTest(async ({ app, models, services }) => {
      await models.sensorModel.create([
        {
          ...getCreateSensorDtoStub(),
          _id: new Types.ObjectId('6478e909e22c60019e07ce8c'),
        },
        {
          ...getCreateSensorDtoStub({
            managedObjectName: 'TestManagedObjectName',
          }),
          _id: new Types.ObjectId('6478e911f990ca5737c33326'),
        },
      ]);

      const user = getTestUser('ums_user', '6478e94f9a64e7d8bba00112', {
        jwtService: services.jwtService,
      });

      const sensorResponse = await request(app.getHttpServer())
        .patch('/sensors')
        .send([
          {
            id: '6478e909e22c60019e07ce8c',
            description: 2,
            valueFragmentDisplayName: 'UpdatedFragmentDisplayName',
            customAttributes: "{ updatedKey: 'updatedValue' }",
          },
          {
            id: '6478e911f990ca5737c33326',
            description: 'AnotherUpdatedDescription',
            valueFragmentDisplayName: 'Type1',
            managedObjectName: 'UpdatedManagedObjectName',
            customAttributes: { attribute: 'value1' },
          },
        ])
        .set('Authorization', `Bearer ${user.userToken}`);

      expect(sensorResponse.status).toEqual(400);
    }),
  );
});
