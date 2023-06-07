import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { connection, Types } from 'mongoose';
import {
  DataFetchTask,
  DataFetchTaskSchema,
  File,
  FileSchema,
  Group,
  ObjectSyncTask,
  ObjectSyncTaskSchema,
  Sensor,
  Task,
  TaskSchema,
  TaskSteps,
  TaskTypes,
} from '../../../models';

import { clearCollections, fakeTime } from '../../../utils/tests';
import { getModelToken, MongooseModuleOptions } from '@nestjs/mongoose';
import { ApplicationConfigService } from '../../application-config/application-config.service';

import { APP_GUARD } from '@nestjs/core';

import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtModuleOptions } from '@nestjs/jwt/dist/interfaces/jwt-module-options.interface';
import { getTestJwtConfig, getTestUser } from '../../../tests/helpers/auth';

import { MessagesProducerService } from '../../messages/messages-producer.service';

import { DefaultUserType } from '../../application-config/types/types';

import { TasksController } from '../tasks.controller';
import { TasksService } from '../tasks.service';
import { TaskMessageMapperService } from '../task-message-mapper.service';
import { TaskCreationService } from '../task-creation.service';
import { GroupSchema } from '../../../models/Group';
import {
  DataUploadTask,
  DataUploadTaskSchema,
} from '../../../models/task/data-upload-task';
import { SensorSchema } from '../../../models/Sensor';
import { JwtAuthGuard } from '../../auth/jwt/jwt-auth.guard';
import { JwtStrategy } from '../../auth/jwt/jwt.strategy';

import { PagingModule } from '../../paging/paging.module';
import { SensorsService } from '../../sensors/sensors.service';
import {
  getCreateDataFetchTaskStub,
  getCreateDataUploadTaskStub,
  getCreateObjectSyncTaskStub,
  getTaskStub,
} from '../../../tests/stubs/task';
import { getSensorStub } from '../../../tests/stubs/sensor';
import { FilesService } from '../../files/files.service';
import { SendMessageParams } from '../../messages/types/producer';
import { ExchangeTypes } from '../../messages/types/exchanges';
import { OutputTaskDto } from '../dto/output/output-task.dto';
import { getFileStub } from '../../../tests/stubs/file';

describe('Tasks integration test', () => {
  let app: INestApplication;
  const now = new Date();

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
    get minioConfig() {
      return {
        url: 'http://localhost:8080',
      };
    },
  } as ApplicationConfigService;

  const testingTaskSchema = TaskSchema.discriminator(
    TaskTypes.DATA_FETCH,
    DataFetchTaskSchema,
  )
    .discriminator(TaskTypes.OBJECT_SYNC, ObjectSyncTaskSchema)
    .discriminator(TaskTypes.DATA_UPLOAD, DataUploadTaskSchema);
  const taskModel = connection.model(Task.name, testingTaskSchema, 'tasks');
  const dataFetchTaskModel = connection.model(
    DataFetchTask.name,
    DataFetchTaskSchema,
    'tasks',
  );
  const dataUploadTaskModel = connection.model(
    DataUploadTask.name,
    DataUploadTaskSchema,
    'tasks',
  );
  const objectSyncTaskModel = connection.model(
    ObjectSyncTask.name,
    ObjectSyncTaskSchema,
    'tasks',
  );
  const groupModel = connection.model(Group.name, GroupSchema);
  const fileModel = connection.model(File.name, FileSchema);
  const sensorModel = connection.model(Sensor.name, SensorSchema);
  const messageProducerService = new MessagesProducerService(null);

  const testJwtService = new JwtService(getTestJwtConfig());

  beforeAll(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [
        PagingModule,
        JwtModule.registerAsync({
          useFactory: () => testingConfigService.jwtConfig,
        }),
      ],
      controllers: [TasksController],
      providers: [
        { provide: getModelToken(Task.name), useValue: taskModel },
        {
          provide: getModelToken(TaskTypes.OBJECT_SYNC),
          useValue: objectSyncTaskModel,
        },
        {
          provide: getModelToken(TaskTypes.DATA_UPLOAD),
          useValue: dataUploadTaskModel,
        },
        {
          provide: getModelToken(TaskTypes.DATA_FETCH),
          useValue: dataFetchTaskModel,
        },
        { provide: getModelToken(Group.name), useValue: groupModel },
        { provide: getModelToken(Sensor.name), useValue: sensorModel },
        { provide: getModelToken(File.name), useValue: fileModel },
        {
          provide: ApplicationConfigService,
          useValue: testingConfigService,
        },
        {
          provide: MessagesProducerService,
          useValue: messageProducerService,
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: JwtService, useValue: testJwtService },
        JwtStrategy,
        SensorsService,
        FilesService,
        TasksService,
        TaskMessageMapperService,
        TaskCreationService,
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

  it('creates data fetch task', async () => {
    const testUser = getTestUser('cndft_user', '647d9cd5f4f9ba0bc66b4ae8', {
      jwtService: testJwtService,
    });

    const sendMessageSpy = jest
      .spyOn(messageProducerService, 'sendMessage')
      .mockImplementation((_args) => undefined);

    const sensorStub = getSensorStub({
      _id: new Types.ObjectId('647d9fb4f6f7e47d8723ad21'),
    });
    await sensorModel.create(sensorStub);

    const createTaskStub = getCreateDataFetchTaskStub(
      {},
      {
        taskPayloadEntities: [
          { id: sensorStub._id, fileName: 'DataFetchFile1' },
        ],
      },
    );

    const output = await request(app.getHttpServer())
      .post('/tasks')
      .send(createTaskStub)
      .set('Authorization', `Bearer ${testUser.userToken}`);

    expect(output.status).toEqual(201);
    expect(output.body).toMatchObject<Partial<OutputTaskDto>>({
      id: expect.any(String),
      taskType: TaskTypes.DATA_FETCH,
      name: 'TestDataFetchTask',
      status: TaskSteps.NOT_STARTED,
      createdAt: expect.any(String),
      metadata: {
        firstRunAt: '2023-05-01T00:00:00.000Z',
      },
      payload: {
        dateFrom: '2023-04-25T00:00:00.000Z',
        dateTo: '2023-04-20T00:00:00.000Z',
        data: [
          {
            sensor: '647d9fb4f6f7e47d8723ad21',
            dataId: expect.any(String),
            fileName: 'DataFetchFile1',
          },
        ],
      },
    });
    expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
      ExchangeTypes.GENERAL,
      'task.scheduled',
      expect.objectContaining({
        taskId: expect.any(String),
        initiatedByUser: '647d9cd5f4f9ba0bc66b4ae8',
        taskName: 'TestDataFetchTask',
        taskType: 'DATA_FETCH',
        firstRunAt: '2023-05-01T00:00:00.000Z',
        payload: {
          data: [
            {
              dataId: expect.any(String),
              fileName: 'DataFetchFile1',
              sensor: {
                id: '647d9fb4f6f7e47d8723ad21',
                fragmentType: 'C8y_Temperature',
                managedObjectId: '100',
              },
            },
          ],
          dateFrom: '2023-04-25T00:00:00.000Z',
          dateTo: '2023-04-20T00:00:00.000Z',
        },
      }),
    );
  });

  it('creates object sync task', async () => {
    const testUser = getTestUser('cost_user', '647dd6b0becf48db843af516', {
      jwtService: testJwtService,
    });

    const sendMessageSpy = jest
      .spyOn(messageProducerService, 'sendMessage')
      .mockImplementation((_args) => undefined);

    const createTaskStub = getCreateObjectSyncTaskStub({});

    const output = await request(app.getHttpServer())
      .post('/tasks')
      .send(createTaskStub)
      .set('Authorization', `Bearer ${testUser.userToken}`);

    expect(output.status).toEqual(201);
    expect(output.body).toMatchObject<Partial<OutputTaskDto>>({
      id: expect.any(String),
      taskType: TaskTypes.OBJECT_SYNC,
      name: 'TestObjectSyncTask',
      status: TaskSteps.NOT_STARTED,
      createdAt: expect.any(String),
      metadata: {
        firstRunAt: '2023-05-02T00:00:00.000Z',
      },
    });
    expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
      ExchangeTypes.GENERAL,
      'task.scheduled',
      expect.objectContaining({
        taskId: expect.any(String),
        initiatedByUser: '647dd6b0becf48db843af516',
        taskName: 'TestObjectSyncTask',
        taskType: 'OBJECT_SYNC',
        firstRunAt: '2023-05-02T00:00:00.000Z',
      }),
    );
  });

  it('creates data upload task', async () => {
    const testUser = getTestUser('cndut_user', '647dda055fbd84a412682e22', {
      jwtService: testJwtService,
    });

    const sendMessageSpy = jest
      .spyOn(messageProducerService, 'sendMessage')
      .mockImplementation(() => {
        return undefined;
      });

    const sensorId = new Types.ObjectId('647dda08d77a33d09f321ec1');
    const sensorStub = getSensorStub({
      _id: sensorId,
      description: 'SensorDesc',
    });
    await sensorModel.create(sensorStub);

    const fileId = new Types.ObjectId('647dda817e5e772ac788fc97');
    const fileStub = getFileStub({
      _id: fileId,
      createdByTask: new Types.ObjectId('647dda84a27c15a9be748963'),
      name: 'File100',
      description: 'Desc',
      metadata: {
        sensors: [sensorId],
        dateFrom: new Date('2023-06-01T00:00:00.000Z'),
        dateTo: new Date('2023-06-03T00:00:00.000Z'),
        managedObjectName: sensorStub.managedObjectName,
        managedObjectId: sensorStub.managedObjectId,
        valueFragments: [
          {
            type: sensorStub.valueFragmentType,
            description: sensorStub.valueFragmentDisplayName,
          },
        ],
      },
      storage: {
        bucket: 'test_bucket',
        path: 'File100.csv',
      },
      customAttributes: {
        test: 'value',
      },
    });

    await fileModel.create(fileStub);

    const createTaskStub = getCreateDataUploadTaskStub(
      {},
      { fileIds: [fileId] },
    );

    const output = await request(app.getHttpServer())
      .post('/tasks')
      .send(createTaskStub)
      .set('Authorization', `Bearer ${testUser.userToken}`);

    expect(output.status).toEqual(201);
    expect(output.body).toMatchObject<Partial<OutputTaskDto>>({
      id: expect.any(String),
      taskType: TaskTypes.DATA_UPLOAD,
      name: 'TestDataUploadTask',
      status: TaskSteps.NOT_STARTED,
      createdAt: expect.any(String),
      metadata: {
        firstRunAt: '2023-05-03T00:00:00.000Z',
      },
      payload: {},
    });
    expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
      ExchangeTypes.GENERAL,
      'task.scheduled',
      expect.objectContaining({
        taskId: expect.any(String),
        initiatedByUser: '647dda055fbd84a412682e22',
        taskName: 'TestDataUploadTask',
        taskType: 'DATA_UPLOAD',
        firstRunAt: '2023-05-03T00:00:00.000Z',
        payload: expect.objectContaining({
          platform: {
            platformIdentifier: 'CKAN',
          },
          files: [
            {
              fileName: 'File100',
              storage: { bucket: 'test_bucket', path: 'File100.csv' },
              metadata: {
                fileDescription: 'Desc',
                sensorDescription: 'SensorDesc',
                dateTo: '2023-06-03T00:00:00.000Z',
                dateFrom: '2023-06-01T00:00:00.000Z',
                managedObjectId: '100',
                managedObjectName: "AA'BB'C1",
                valueFragmentType: 'C8y_Temperature',
                valueFragmentDescription: 'Temperature',
              },
              customAttributes: {
                room: '1000',
                floor: '2',
                test: 'value',
              },
            },
          ],
        }),
      }),
    );
  });

  it('gets specific task', async () => {
    const testUser = getTestUser('gst_user_2', '647def0431e60c140e279c59', {
      jwtService: testJwtService,
    });

    const sensorId = new Types.ObjectId('647def0a9cf6e61af476ebc0');
    const sensorStub = getSensorStub({
      _id: sensorId,
    });
    await sensorModel.create(sensorStub);

    const createTaskStub = getCreateDataFetchTaskStub(
      { name: 'GetTaskName' },
      {
        taskPayloadEntities: [
          { id: sensorStub._id, fileName: 'DataFetchFile12' },
        ],
      },
    );

    await dataFetchTaskModel.create({
      _id: new Types.ObjectId('647def39ef5bb2f5f8cd6d64'),
      status: TaskSteps.PROCESSING,
      name: createTaskStub.name,
      initiatedByUser: new Types.ObjectId('647def0431e60c140e279c59'),
      payload: {
        dateFrom: createTaskStub.taskPayload.dateFrom,
        dateTo: createTaskStub.taskPayload.dateTo,
        data: [
          {
            sensor: sensorId,
            dataId: 'id1',
            fileId: '647df10fb16ccb76052ebdb6',
            fileName: 'DataFetchFile12',
            bucket: 'test_bucket',
          },
        ],
      },
      metadata: {
        firstRunAt: createTaskStub.firstRunAt,
      },
    });

    const output = await request(app.getHttpServer())
      .get('/tasks/647def39ef5bb2f5f8cd6d64')
      .set('Authorization', `Bearer ${testUser.userToken}`);

    expect(output.status).toEqual(200);
    expect(output.body).toMatchObject<Partial<OutputTaskDto>>({
      id: expect.any(String),
      taskType: TaskTypes.DATA_FETCH,
      name: 'GetTaskName',
      status: TaskSteps.PROCESSING,
      createdAt: expect.any(String),
      metadata: {
        firstRunAt: '2023-05-01T00:00:00.000Z',
      },
      payload: {
        dateFrom: '2023-04-25T00:00:00.000Z',
        dateTo: '2023-04-20T00:00:00.000Z',
        data: [
          {
            sensor: '647def0a9cf6e61af476ebc0',
            dataId: expect.any(String),
            fileName: 'DataFetchFile12',
          },
        ],
      },
    });
  });

  it('searches tasks by periodic status', async () => {
    const testUser = getTestUser(
      'searches_tasks_user_3',
      '647e2fe16a85ae0e3c3facf4',
      {
        jwtService: testJwtService,
      },
    );

    const sensorStub = getSensorStub({
      _id: new Types.ObjectId('647e2fd67e7c201487148418'),
    });
    await sensorModel.create(sensorStub);

    const task1 = getTaskStub(TaskTypes.DATA_FETCH, {
      _id: new Types.ObjectId('647e2fd96da905afbdeccae3'),
      name: 'SDataFetchTask1',
    });

    const task2 = getTaskStub(TaskTypes.DATA_UPLOAD, {
      _id: new Types.ObjectId('647e2ed5beffe4dea398344c'),
      name: 'SDataFetchTask2',
    });

    const task3 = getTaskStub(TaskTypes.DATA_FETCH, {
      _id: new Types.ObjectId('647e2fdc9fcf533d82edfa29'),
      metadata: {
        firstRunAt: new Date('2023-05-03T00:00:00.000Z'),
        periodicData: {
          pattern: '0 */5 * * * *',
        },
      },
    });

    await taskModel.create([task1, task2, task3]);
    const output = await request(app.getHttpServer())
      .get('/tasks/search?isPeriodic=true')
      .set('Authorization', `Bearer ${testUser.userToken}`);

    expect(output.status).toEqual(200);
    expect(output.body).toMatchObject({
      pageInfo: { pageSize: 10, currentPage: 1 },
      data: expect.arrayContaining([
        expect.objectContaining({
          id: '647e2fdc9fcf533d82edfa29',
          taskType: 'DATA_FETCH',
          name: 'TestingTask',
          status: 'PROCESSING',
        }),
      ]),
    });
  });

  it('searches tasks by task type', async () => {
    const testUser = getTestUser(
      'searches_tasks_user_4',
      '647e332d90c40f4001c5743b',
      {
        jwtService: testJwtService,
      },
    );

    const sensorStub = getSensorStub({
      _id: new Types.ObjectId('647e3333309cf126e00e1af2'),
    });
    await sensorModel.create(sensorStub);

    const task1 = getTaskStub(TaskTypes.DATA_FETCH, {
      _id: new Types.ObjectId('647e3336614d08fe4fe1beb0'),
      name: 'SDataFetchTask4',
    });

    const task2 = getTaskStub(TaskTypes.DATA_UPLOAD, {
      _id: new Types.ObjectId('647e333ab711f3f212a1e3f8'),
      name: 'SDataFetchTask5',
    });

    const task3 = getTaskStub(TaskTypes.DATA_FETCH, {
      _id: new Types.ObjectId('647e333ee37c347587fae058'),
      metadata: {
        firstRunAt: new Date('2023-05-03T00:00:00.000Z'),
        periodicData: {
          pattern: '0 */5 * * * *',
        },
      },
    });

    await taskModel.create([task1, task2, task3]);
    const output = await request(app.getHttpServer())
      .get('/tasks/search?taskType=data_fetch')
      .set('Authorization', `Bearer ${testUser.userToken}`);

    expect(output.status).toEqual(200);
    expect(output.body).toMatchObject({
      pageInfo: { pageSize: 10, currentPage: 1 },
      data: expect.arrayContaining([
        expect.objectContaining({
          id: '647e333ee37c347587fae058',
          taskType: 'DATA_FETCH',
          name: 'TestingTask',
          status: 'PROCESSING',
        }),
        expect.objectContaining({
          id: '647e3336614d08fe4fe1beb0',
          taskType: 'DATA_FETCH',
          name: 'SDataFetchTask4',
          status: 'PROCESSING',
        }),
      ]),
    });
  });
});
