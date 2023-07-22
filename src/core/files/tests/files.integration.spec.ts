import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { Connection, Types } from 'mongoose';
import {
  File,
  FileModel,
  FileSchema,
  Sensor,
  VisibilityState,
} from '../../../models';

import { fakeTime } from '../../../utils/tests';
import { getModelToken, MongooseModuleOptions } from '@nestjs/mongoose';
import { ApplicationConfigService } from '../../application-config/application-config.service';

import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../../auth/jwt/jwt-auth.guard';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtModuleOptions } from '@nestjs/jwt/dist/interfaces/jwt-module-options.interface';
import { getTestJwtConfig, getTestUser } from '../../../tests/helpers/auth';
import { JwtStrategy } from '../../auth/jwt/jwt.strategy';

import { SensorModel, SensorSchema } from '../../../models/Sensor';
import { getSensorStub } from '../../../tests/stubs/sensor';
import { PagingModule } from '../../paging/paging.module';
import { FilesController } from '../files.controller';
import { FilesService } from '../files.service';
import { MessagesProducerService } from '../../messages/messages-producer.service';
import { SensorsService } from '../../sensors/sensors.service';
import { getFileStub } from '../../../tests/stubs/file';
import { OutputFileDto } from '../dto/output-file.dto';
import { FileLink, FileWithSensorProblem } from '../types/types';
import { Role } from '../../../global/types/roles';
import { SendMessageParams } from '../../messages/types/producer';
import { ExchangeTypes } from '../../messages/types/exchanges';
import {
  setupTest,
  WithIntegrationSetupTestResult,
} from '../../../../test/setup/setup';

type FilesIntegrationExtension = WithIntegrationSetupTestResult<{
  models: {
    sensorModel: SensorModel;
    fileModel: FileModel;
  };
  services: {
    jwtService: JwtService;
    configService: ApplicationConfigService;
    messagesProducerService: MessagesProducerService;
  };
}>;
describe('Files integration test', () => {
  const now = new Date();

  function withTest(
    callback: (params: FilesIntegrationExtension) => Promise<void>,
  ): () => Promise<void> {
    async function setupFn(
      connection: Connection,
    ): Promise<FilesIntegrationExtension> {
      const sensorModel = connection.model(Sensor.name, SensorSchema);
      const fileModel = connection.model(File.name, FileSchema);

      const messagesProducerService = new MessagesProducerService(null);

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
        get minioConfig() {
          return {
            url: 'http://localhost:1234',
          };
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
        controllers: [FilesController],
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
          JwtStrategy,
          { provide: getModelToken(Sensor.name), useValue: sensorModel },
          { provide: getModelToken(File.name), useValue: fileModel },
          SensorsService,
          FilesService,
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
          fileModel,
        },
        services: {
          jwtService: testJwtService,
          configService: testingConfigService as ApplicationConfigService,
          messagesProducerService,
        },
      };
    }

    return setupTest<FilesIntegrationExtension>(setupFn, callback);
  }

  beforeEach(() => fakeTime({ now, fake: ['Date'] }));
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it.concurrent(
    'gets a specific file',
    withTest(async ({ app, models, services }) => {
      const testUser = getTestUser('sf_user', '647b290bc4b2685753b58936', {
        jwtService: services.jwtService,
      });

      const sensor1Id = new Types.ObjectId('647b252463acc0239eb7d738');
      const sensor1 = getSensorStub({
        _id: sensor1Id,
        managedObjectName: 'FileSensor1',
        valueFragmentType: 'FS1',
        valueFragmentDisplayName: 'FileSensor1Fragment',
        managedObjectId: '123',
      });

      await models.sensorModel.create(sensor1);

      const fileStub = getFileStub({
        _id: new Types.ObjectId('647b28b89fcf681c18e7e4a4'),
        createdByTask: new Types.ObjectId('647b259a05959e24d0d569e0'),
        name: 'File1',
        description: 'Desc',
        metadata: {
          sensors: [sensor1Id],
          dateFrom: new Date('2023-06-01T00:00:00.000Z'),
          dateTo: new Date('2023-06-03T00:00:00.000Z'),
          managedObjectName: sensor1.managedObjectName,
          managedObjectId: sensor1.managedObjectId,
          valueFragments: [
            {
              type: sensor1.valueFragmentType,
              description: sensor1.valueFragmentDisplayName,
            },
          ],
        },
        storage: {
          bucket: 'test_bucket',
          path: 'File1.csv',
        },
      });

      await models.fileModel.create(fileStub);
      const output = await request(app.getHttpServer())
        .get('/files/647b28b89fcf681c18e7e4a4')
        .set('Authorization', `Bearer ${testUser.userToken}`);

      expect(output.status).toEqual(200);
      expect(output.body).toMatchObject<OutputFileDto>({
        id: '647b28b89fcf681c18e7e4a4',
        createdByTask: '647b259a05959e24d0d569e0',
        name: 'File1',
        description: 'Desc',
        visibilityState: {
          published: false,
          exposedToPlatforms: [],
          stateChanging: false,
        },
        metadata: {
          sensors: ['647b252463acc0239eb7d738'],
          dateFrom: '2023-06-01T00:00:00.000Z',
          dateTo: '2023-06-03T00:00:00.000Z',
          managedObjectId: '123',
          managedObjectName: 'FileSensor1',
          valueFragments: [{ type: 'FS1', description: 'FileSensor1Fragment' }],
        },
        storage: {
          bucket: 'test_bucket',
          path: 'File1.csv',
        },
      });
    }),
  );

  it.concurrent(
    'gets current file link',
    withTest(async ({ app, models, services }) => {
      const testUser = getTestUser('gcfl_user', '647b3e4999333c748df76bb9', {
        jwtService: services.jwtService,
      });

      const sensor1Id = new Types.ObjectId('647b3e453b7568b47de69248');
      const sensor1 = getSensorStub({
        _id: sensor1Id,
        managedObjectName: 'FileSensor2',
        valueFragmentType: 'FS2',
        valueFragmentDisplayName: 'FileSensor2Fragment',
        managedObjectId: '123',
      });

      await models.sensorModel.create(sensor1);

      const fileStub = getFileStub({
        _id: new Types.ObjectId('647b3e6f68c1e94bb6cf11aa'),
        createdByTask: new Types.ObjectId('647b3e67530c4f0893b895f1'),
        name: 'File2',
        description: 'Desc',
        metadata: {
          sensors: [sensor1Id],
          dateFrom: new Date('2023-06-01T00:00:00.000Z'),
          dateTo: new Date('2023-06-03T00:00:00.000Z'),
          managedObjectName: sensor1.managedObjectName,
          managedObjectId: sensor1.managedObjectId,
          valueFragments: [
            {
              type: sensor1.valueFragmentType,
              description: sensor1.valueFragmentDisplayName,
            },
          ],
        },
        storage: {
          bucket: 'test_bucket',
          path: 'File2.csv',
        },
      });

      await models.fileModel.create(fileStub);
      const output = await request(app.getHttpServer())
        .get('/files/647b3e6f68c1e94bb6cf11aa/link')
        .set('Authorization', `Bearer ${testUser.userToken}`);

      expect(output.status).toEqual(200);
      expect(output.body).toMatchObject<FileLink>({
        id: '647b3e6f68c1e94bb6cf11aa',
        fileName: 'File2',
        url: services.configService.minioConfig.url + '/test_bucket/File2.csv',
      });
    }),
  );

  it.concurrent(
    'does not get file link when file is unpublished and user is not admin',
    withTest(async ({ app, models, services }) => {
      const testUser = getTestUser(
        'dngflwfiuna_user',
        '647b3fe6e540baef16b47b2f',
        {
          jwtService: services.jwtService,
          roles: [Role.User],
        },
      );

      const sensor1Id = new Types.ObjectId('647b3fe90203c766f02917d7');
      const sensor1 = getSensorStub({
        _id: sensor1Id,
        managedObjectName: 'FileSensor3',
        valueFragmentType: 'FS3',
        valueFragmentDisplayName: 'FileSensor3Fragment',
        managedObjectId: '123',
      });

      await models.sensorModel.create(sensor1);

      const fileStub = getFileStub({
        _id: new Types.ObjectId('647b3ff53cbf26e48d7f05b4'),
        createdByTask: new Types.ObjectId('647b3ff96070255af0fda1ad'),
        name: 'File3',
        description: 'Desc',
        metadata: {
          sensors: [sensor1Id],
          dateFrom: new Date('2023-06-01T00:00:00.000Z'),
          dateTo: new Date('2023-06-03T00:00:00.000Z'),
          managedObjectName: sensor1.managedObjectName,
          managedObjectId: sensor1.managedObjectId,
          valueFragments: [
            {
              type: sensor1.valueFragmentType,
              description: sensor1.valueFragmentDisplayName,
            },
          ],
        },
        storage: {
          bucket: 'test_bucket',
          path: 'File3.csv',
        },
      });

      await models.fileModel.create(fileStub);
      const output = await request(app.getHttpServer())
        .get('/files/647b3ff53cbf26e48d7f05b4/link')
        .set('Authorization', `Bearer ${testUser.userToken}`);

      expect(output.status).toEqual(403);
      expect(output.body).toMatchObject({
        statusCode: 403,
        message: 'Forbidden',
      });
    }),
  );

  it.concurrent(
    'checks files for upload readiness',
    withTest(async ({ app, models, services }) => {
      const testUser = getTestUser('cfur_user', '647c5616d0d1f35ba6655ff0', {
        jwtService: services.jwtService,
      });

      const sensor1Id = new Types.ObjectId('647c561adb856dc372990861');
      const sensor1 = getSensorStub({
        _id: sensor1Id,
        managedObjectName: 'FileSensor10',
        valueFragmentType: 'FS10',
        valueFragmentDisplayName: undefined,
        managedObjectId: '123',
      });

      await models.sensorModel.create(sensor1);

      const fileStub = getFileStub({
        _id: new Types.ObjectId('647c561eb5eb09f9f257ccba'),
        createdByTask: new Types.ObjectId('647c5621c7c7f73e33a06da5'),
        name: 'File10',
        description: 'Desc',
        metadata: {
          sensors: [sensor1Id],
          dateFrom: new Date('2023-06-01T00:00:00.000Z'),
          dateTo: new Date('2023-06-03T00:00:00.000Z'),
          managedObjectName: sensor1.managedObjectName,
          managedObjectId: sensor1.managedObjectId,
          valueFragments: [
            {
              type: sensor1.valueFragmentType,
            },
          ],
        },
        storage: {
          bucket: 'test_bucket',
          path: 'File10.csv',
        },
      });

      await models.fileModel.create(fileStub);
      const output = await request(app.getHttpServer())
        .get('/files/upload-readiness?fileIds=647c561eb5eb09f9f257ccba')
        .set('Authorization', `Bearer ${testUser.userToken}`);

      expect(output.status).toEqual(200);
      expect(output.body).toEqual(
        expect.arrayContaining<FileWithSensorProblem>([
          {
            fileId: '647c561eb5eb09f9f257ccba',
            sensor: {
              sensorId: '647c561adb856dc372990861',
              problem:
                'valueFragmentDisplayName must be present for uploading file to external system',
            },
          },
        ]),
      );
    }),
  );

  it.concurrent(
    'changes file visibility state',
    withTest(async ({ app, models, services }) => {
      const testUser = getTestUser('cfur_user', '647c6f329749d34acd2f8c3f', {
        jwtService: services.jwtService,
      });

      const sendMessageSpy = jest
        .spyOn(services.messagesProducerService, 'sendMessage')
        .mockImplementation((_args) => undefined);

      const sensor1Id = new Types.ObjectId('647c6f6dcb44af9700c3f8a6');
      const sensor1 = getSensorStub({
        _id: sensor1Id,
        managedObjectName: 'FileSensor20',
        valueFragmentType: 'FS20',
        valueFragmentDisplayName: undefined,
        managedObjectId: '123',
      });

      await models.sensorModel.create(sensor1);

      const fileStub = getFileStub({
        _id: new Types.ObjectId('647c6f7484948887451a45ea'),
        createdByTask: new Types.ObjectId('647c6f76b00fd9c92d9dbf59'),
        name: 'File20',
        description: 'Desc',
        metadata: {
          sensors: [sensor1Id],
          dateFrom: new Date('2023-06-01T00:00:00.000Z'),
          dateTo: new Date('2023-06-03T00:00:00.000Z'),
          managedObjectName: sensor1.managedObjectName,
          managedObjectId: sensor1.managedObjectId,
          valueFragments: [
            {
              type: sensor1.valueFragmentType,
            },
          ],
        },
        storage: {
          bucket: 'test_bucket',
          path: 'File20.csv',
        },
      });

      await models.fileModel.create(fileStub);
      const output = await request(app.getHttpServer())
        .post('/files/647c6f7484948887451a45ea/visibility-state')
        .send({ newVisibilityState: VisibilityState.PUBLIC })
        .set('Authorization', `Bearer ${testUser.userToken}`);

      expect(output.status).toEqual(200);
      expect(output.body).toMatchObject<Partial<OutputFileDto>>({
        id: '647c6f7484948887451a45ea',
        name: 'File20',
        visibilityState: expect.objectContaining({
          published: false,
          stateChanging: true,
        }),
      });
      expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
        ExchangeTypes.GENERAL,
        'file.status.visibility.state',
        {
          newVisibilityState: VisibilityState.PUBLIC,
          bucket: 'test_bucket',
          filePath: 'File20.csv',
          fileId: '647c6f7484948887451a45ea',
        },
      );
    }),
  );

  it.concurrent(
    'deletes one file',
    withTest(async ({ app, models, services }) => {
      const testUser = getTestUser('dof_user', '647c5cb7a7b28c53635ffa03', {
        jwtService: services.jwtService,
      });

      const sendMessageSpy = jest
        .spyOn(services.messagesProducerService, 'sendMessage')
        .mockImplementation((_args) => undefined);

      const sensor1Id = new Types.ObjectId('647c5cbb41c4e44da374e62b');
      const sensor1 = getSensorStub({
        _id: sensor1Id,
        managedObjectName: 'FileSensor12',
        valueFragmentType: 'FS12',
        valueFragmentDisplayName: 'FileSensor12Fragment',
        managedObjectId: '123',
      });

      await models.sensorModel.create(sensor1);

      const fileStub = getFileStub({
        _id: new Types.ObjectId('647c5cbec58128b12b207a3f'),
        createdByTask: new Types.ObjectId('647c5cc499743b68897a39bb'),
        name: 'File12',
        description: 'Desc',
        metadata: {
          sensors: [sensor1Id],
          dateFrom: new Date('2023-06-01T00:00:00.000Z'),
          dateTo: new Date('2023-06-03T00:00:00.000Z'),
          managedObjectName: sensor1.managedObjectName,
          managedObjectId: sensor1.managedObjectId,
          valueFragments: [
            {
              type: sensor1.valueFragmentType,
              description: sensor1.valueFragmentDisplayName,
            },
          ],
        },
        storage: {
          bucket: 'test_bucket',
          path: 'File12.csv',
        },
      });

      await models.fileModel.create(fileStub);
      const output = await request(app.getHttpServer())
        .delete('/files/647c5cbec58128b12b207a3f')
        .set('Authorization', `Bearer ${testUser.userToken}`);

      expect(output.status).toEqual(200);
      expect(output.body).toEqual({});
      expect(
        (await models.sensorModel.findById(sensor1Id))._id.toString(),
      ).toEqual('647c5cbb41c4e44da374e62b');
      expect(await models.fileModel.findById(fileStub._id)).toBeNull();
      expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
        ExchangeTypes.GENERAL,
        'file.status.deletion',
        { files: [{ path: 'File12.csv', bucket: 'test_bucket' }] },
      );
    }),
  );

  it.concurrent(
    'deletes many files',
    withTest(async ({ app, models, services }) => {
      const { fileModel, sensorModel } = models;

      const testUser = getTestUser('dmu_user', '647c5ebd694747230f1a75cc', {
        jwtService: services.jwtService,
      });

      const sendMessageSpy = jest
        .spyOn(services.messagesProducerService, 'sendMessage')
        .mockImplementation((_args) => undefined);

      const sensor1Id = new Types.ObjectId('647c5ec0ed490d06731b3e7d');
      const sensor2Id = new Types.ObjectId('647c5edd7f8e4625f962b69f');
      const sensor1 = getSensorStub({
        _id: sensor1Id,
        managedObjectName: 'FileSensor13',
        valueFragmentType: 'FS13',
        valueFragmentDisplayName: 'FileSensor13Fragment',
        managedObjectId: '123',
      });
      const sensor2 = getSensorStub({
        _id: sensor2Id,
        managedObjectName: 'FileSensor14',
        valueFragmentType: 'FS14',
        valueFragmentDisplayName: 'FileSensor14Fragment',
        managedObjectId: '123',
      });

      await sensorModel.create([sensor1, sensor2]);

      const fileStub1 = getFileStub({
        _id: new Types.ObjectId('647c5ec604b53a5cc9ce4e80'),
        createdByTask: new Types.ObjectId('647c5ec95a172d5c13596e93'),
        name: 'File13',
        description: 'Desc',
        metadata: {
          sensors: [sensor1Id],
          dateFrom: new Date('2023-06-01T00:00:00.000Z'),
          dateTo: new Date('2023-06-03T00:00:00.000Z'),
          managedObjectName: sensor1.managedObjectName,
          managedObjectId: sensor1.managedObjectId,
          valueFragments: [
            {
              type: sensor1.valueFragmentType,
              description: sensor1.valueFragmentDisplayName,
            },
          ],
        },
        storage: {
          bucket: 'test_bucket',
          path: 'File13.csv',
        },
      });

      const fileStub2 = getFileStub({
        _id: new Types.ObjectId('647c5f16e12f0434c9a4dbd6'),
        createdByTask: new Types.ObjectId('647c5ec95a172d5c13596e93'),
        name: 'File14',
        description: 'Desc',
        metadata: {
          sensors: [sensor2Id],
          dateFrom: new Date('2023-06-01T00:00:00.000Z'),
          dateTo: new Date('2023-06-03T00:00:00.000Z'),
          managedObjectName: sensor2.managedObjectName,
          managedObjectId: sensor2.managedObjectId,
          valueFragments: [
            {
              type: sensor2.valueFragmentType,
              description: sensor2.valueFragmentDisplayName,
            },
          ],
        },
        storage: {
          bucket: 'test_bucket',
          path: 'File14.csv',
        },
      });

      const fileStub3 = getFileStub({
        _id: new Types.ObjectId('647c618d450d066fa64f7f17'),
        name: 'File15',
      });

      await fileModel.create([fileStub1, fileStub2, fileStub3]);
      const output = await request(app.getHttpServer())
        .post('/files/delete')
        .send({
          items: ['647c5ec604b53a5cc9ce4e80', '647c5f16e12f0434c9a4dbd6'],
        })
        .set('Authorization', `Bearer ${testUser.userToken}`);

      expect(output.status).toEqual(200);
      expect(output.body).toEqual({});
      expect((await sensorModel.findById(sensor1Id))._id.toString()).toEqual(
        '647c5ec0ed490d06731b3e7d',
      );
      expect((await sensorModel.findById(sensor2Id))._id.toString()).toEqual(
        '647c5edd7f8e4625f962b69f',
      );
      expect((await fileModel.findById(fileStub3._id))._id.toString()).toEqual(
        '647c618d450d066fa64f7f17',
      );
      expect(
        await fileModel.find({ _id: { $in: [sensor1Id, sensor2Id] } }),
      ).toEqual([]);
      expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
        ExchangeTypes.GENERAL,
        'file.status.deletion',
        {
          files: expect.arrayContaining([
            { path: 'File13.csv', bucket: 'test_bucket' },
            { path: 'File14.csv', bucket: 'test_bucket' },
          ]),
        },
      );
    }),
  );

  it.concurrent(
    'searches files from time frame',
    withTest(async ({ app, models, services }) => {
      const testUser = getTestUser(
        'searches_files_user_2',
        '647c8ce423121bc54b5664b8',
        {
          jwtService: services.jwtService,
        },
      );

      const sensor1Id = new Types.ObjectId('647c8d22677b8f1c59a69df2');
      const sensor2Id = new Types.ObjectId('647c8d25c7a06ec1dcdbef19');
      const sensor3Id = new Types.ObjectId('647c8d28288787b66637f289');
      const sensor1 = getSensorStub({
        _id: sensor1Id,
        managedObjectName: 'FileSensor30',
        valueFragmentType: 'FS30',
        valueFragmentDisplayName: 'FileSensor30Fragment',
        managedObjectId: '777',
      });
      const sensor2 = getSensorStub({
        _id: sensor2Id,
        managedObjectName: 'FileSensor31',
        valueFragmentType: 'FS31',
        valueFragmentDisplayName: 'FileSensor31Fragment',
        managedObjectId: '123',
      });
      const sensor3 = getSensorStub({
        _id: sensor3Id,
        managedObjectName: 'FileSensor32',
        valueFragmentType: 'FS32',
        valueFragmentDisplayName: 'FileSensor32Fragment',
        managedObjectId: '123',
      });

      await models.sensorModel.create([sensor1, sensor2, sensor3]);

      const fileStub1 = getFileStub({
        _id: new Types.ObjectId('647c8d2c43cfd12bf7d0aa1b'),
        createdByTask: new Types.ObjectId('647c8d302fb3f6474c2e0d8d'),
        name: 'File30',
        description: 'Desc',
        metadata: {
          sensors: [sensor1Id],
          dateFrom: new Date('2023-03-01T00:00:00.000Z'),
          dateTo: new Date('2023-03-10T00:00:00.000Z'),
          managedObjectName: sensor1.managedObjectName,
          managedObjectId: sensor1.managedObjectId,
          valueFragments: [
            {
              type: sensor1.valueFragmentType,
              description: sensor1.valueFragmentDisplayName,
            },
          ],
        },
        storage: {
          bucket: 'test_bucket',
          path: 'File30.csv',
        },
      });

      const fileStub2 = getFileStub({
        _id: new Types.ObjectId('647c8d336d014dba25627251'),
        createdByTask: new Types.ObjectId('647c8d387fdbd6dc9454dfaa'),
        name: 'File31',
        description: 'Desc',
        metadata: {
          sensors: [sensor2Id],
          dateFrom: new Date('2023-04-01T00:00:00.000Z'),
          dateTo: new Date('2023-04-14T00:00:00.000Z'),
          managedObjectName: sensor2.managedObjectName,
          managedObjectId: sensor2.managedObjectId,
          valueFragments: [
            {
              type: sensor2.valueFragmentType,
              description: sensor2.valueFragmentDisplayName,
            },
          ],
        },
        storage: {
          bucket: 'test_bucket',
          path: 'File31.csv',
        },
      });

      const fileStub3 = getFileStub({
        _id: new Types.ObjectId('647c8da7c0c634c32dcdd275'),
        createdByTask: new Types.ObjectId('647c8dad314d7990e02650c3'),
        name: 'File32',
        description: 'Desc2',
        metadata: {
          sensors: [sensor2Id],
          dateFrom: new Date('2023-05-05T00:00:00.000Z'),
          dateTo: new Date('2023-05-16T00:00:00.000Z'),
          managedObjectName: sensor2.managedObjectName,
          managedObjectId: sensor2.managedObjectId,
          valueFragments: [
            {
              type: sensor2.valueFragmentType,
              description: sensor2.valueFragmentDisplayName,
            },
          ],
        },
        storage: {
          bucket: 'test_bucket',
          path: 'File32.csv',
        },
      });

      await models.fileModel.create([fileStub1, fileStub2, fileStub3]);
      const output = await request(app.getHttpServer())
        .get(
          '/files/search?dateFrom=2023-03-20T00:00:00.000Z&dateTo=2023-04-25T00:00:00.000Z',
        )
        .set('Authorization', `Bearer ${testUser.userToken}`);

      expect(output.status).toEqual(200);
      expect(output.body).toEqual({
        pageInfo: expect.objectContaining({
          pageSize: 10,
          currentPage: 1,
        }),
        data: expect.arrayContaining([
          expect.objectContaining<Partial<OutputFileDto>>({
            id: '647c8d336d014dba25627251',
            name: 'File31',
          }),
        ]),
      });
    }),
  );

  it.concurrent(
    'searches files by sensor valueFragmentType (data type) sorting newer files first',
    withTest(async ({ app, models, services }) => {
      const testUser = getTestUser(
        'searches_files_user_3',
        '647c983419516bcaf524a850',
        {
          jwtService: services.jwtService,
        },
      );

      const sensor1Id = new Types.ObjectId('647c9839203a7c59dcc0fc7b');
      const sensor2Id = new Types.ObjectId('647c983ca187d82a1fc63714');
      const sensor3Id = new Types.ObjectId('647c99456ad2a1da47e2d6d5');
      const sensor1 = getSensorStub({
        _id: sensor1Id,
        managedObjectName: 'FileSensor40',
        valueFragmentType: 'FS40',
        valueFragmentDisplayName: 'FileSensor40Fragment',
        managedObjectId: '777',
      });
      const sensor2 = getSensorStub({
        _id: sensor2Id,
        managedObjectName: 'FileSensor41',
        valueFragmentType: 'FS42',
        valueFragmentDisplayName: 'FileSensor41Fragment',
        managedObjectId: '123',
      });
      const sensor3 = getSensorStub({
        _id: sensor3Id,
        managedObjectName: 'FileSensor42',
        valueFragmentType: 'FS42',
        valueFragmentDisplayName: 'FileSensor42Fragment',
        managedObjectId: '123',
      });

      await models.sensorModel.create([sensor1, sensor2, sensor3]);

      const fileStub1 = getFileStub({
        _id: new Types.ObjectId('647c9950c2f3c165aa499d22'),
        createdByTask: new Types.ObjectId('647c8d302fb3f6474c2e0d8d'),
        name: 'File40',
        description: 'Desc',
        metadata: {
          sensors: [sensor1Id],
          dateFrom: new Date('2023-03-01T00:00:00.000Z'),
          dateTo: new Date('2023-03-10T00:00:00.000Z'),
          managedObjectName: sensor1.managedObjectName,
          managedObjectId: sensor1.managedObjectId,
          valueFragments: [
            {
              type: sensor1.valueFragmentType,
              description: sensor1.valueFragmentDisplayName,
            },
          ],
        },
        storage: {
          bucket: 'test_bucket',
          path: 'File40.csv',
        },
      });

      const fileStub2 = getFileStub({
        _id: new Types.ObjectId('647c9cb55f8ad5f37d6a2466'),
        createdByTask: new Types.ObjectId('647c8d387fdbd6dc9454dfaa'),
        name: 'File51',
        description: 'Desc',
        metadata: {
          sensors: [sensor2Id],
          dateFrom: new Date('2023-04-01T00:00:00.000Z'),
          dateTo: new Date('2023-04-14T00:00:00.000Z'),
          managedObjectName: sensor2.managedObjectName,
          managedObjectId: sensor2.managedObjectId,
          valueFragments: [
            {
              type: sensor2.valueFragmentType,
              description: sensor2.valueFragmentDisplayName,
            },
          ],
        },
        storage: {
          bucket: 'test_bucket',
          path: 'File51.csv',
        },
      });

      const fileStub3 = getFileStub({
        _id: new Types.ObjectId('647c9c9c4a17df8b791f32f8'),
        createdByTask: new Types.ObjectId('647c8dad314d7990e02650c3'),
        name: 'File54',
        description: 'Desc2',
        metadata: {
          sensors: [sensor2Id],
          dateFrom: new Date('2023-05-05T00:00:00.000Z'),
          dateTo: new Date('2023-05-16T00:00:00.000Z'),
          managedObjectName: sensor2.managedObjectName,
          managedObjectId: sensor2.managedObjectId,
          valueFragments: [
            {
              type: sensor2.valueFragmentType,
              description: sensor2.valueFragmentDisplayName,
            },
          ],
        },
        storage: {
          bucket: 'test_bucket',
          path: 'File54.csv',
        },
      });

      await models.fileModel.create([fileStub1, fileStub2, fileStub3]);
      const output = await request(app.getHttpServer())
        .get('/files/search?valueFragmentType=FS42')
        .set('Authorization', `Bearer ${testUser.userToken}`);

      expect(output.status).toEqual(200);
      expect(output.body).toEqual({
        pageInfo: expect.objectContaining({
          pageSize: 10,
          currentPage: 1,
        }),
        data: [
          expect.objectContaining<Partial<OutputFileDto>>({
            id: '647c9cb55f8ad5f37d6a2466',
            name: 'File51',
          }),
          expect.objectContaining<Partial<OutputFileDto>>({
            id: '647c9c9c4a17df8b791f32f8',
            name: 'File54',
          }),
        ],
      });
    }),
  );
});
