import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from '../tasks.service';
import { connection, Types } from 'mongoose';
import {
  DataFetchTask,
  DataFetchTaskSchema,
  FileSchema,
  ObjectSyncTask,
  ObjectSyncTaskSchema,
  Task,
  File,
  TaskDocument,
  TaskSchema,
  TaskSteps,
  TaskTypes,
} from '../../../models';
import {
  DataUploadTask,
  DataUploadTaskSchema,
} from '../../../models/task/data-upload-task';

import { getModelToken } from '@nestjs/mongoose';
import { MessagesProducerService } from '../../messages/messages-producer.service';
import { clearCollections, fakeTime } from '../../../utils/tests';
import { TaskCreationService } from '../task-creation.service';
import { TaskMessageMapperService } from '../task-message-mapper.service';
import { SkipPagingService } from '../../paging/skip-paging.service';
import { WithInitiatedByUser } from '../../auth/types/types';
import { Properties } from '../../../global/types/types';
import { CreateTaskDto } from '../dto/input/create-task.dto';
import { SendMessageParams } from '../../messages/types/producer';
import { ExchangeTypes } from '../../messages/types/exchanges';
import { Logger } from '@nestjs/common';
import { getFileStub } from '../../../tests/stubs/file';

describe('TasksService', () => {
  let service: TasksService;
  let module: TestingModule;
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
  const fileModel = connection.model(File.name, FileSchema);
  const mockTaskCreationService = {
    createTask: jest
      .fn()
      .mockImplementation(
        async <T extends WithInitiatedByUser<Properties<CreateTaskDto>>>(
          taskDetails: T,
        ): Promise<TaskDocument> => {
          return await taskModel.create({
            initiatedByUser: taskDetails.initiatedByUser,
            taskType: taskDetails.taskType,
            name: taskDetails.name,
            payload: {},
            metadata: {
              firstRunAt: taskDetails.firstRunAt,
              periodicData: taskDetails.periodicData,
            },
          });
        },
      ),
  };

  const messageProducerService = new MessagesProducerService(null);
  const sendMessageSpy = jest
    .spyOn(messageProducerService, 'sendMessage')
    .mockImplementation((_args) => undefined);

  beforeAll(async () => {
    module = await Test.createTestingModule({
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
        { provide: MessagesProducerService, useValue: messageProducerService },
        { provide: TaskCreationService, useValue: mockTaskCreationService },
        {
          provide: TaskMessageMapperService,
          useClass: TaskMessageMapperService,
        },
        { provide: SkipPagingService, useClass: SkipPagingService },
        TasksService,
      ],
    })
      .setLogger(new Logger())
      .compile();

    service = module.get<TasksService>(TasksService);
  });

  beforeEach(async () => {
    await module.init();
  });

  afterEach(async () => {
    jest.useRealTimers();
    jest.clearAllMocks();
    await module.close();
    await clearCollections(connection);
  });

  it('creates and schedules task', async () => {
    const objectSyncTask: ObjectSyncTask = {
      taskType: TaskTypes.OBJECT_SYNC,
      name: 'Test Object Syncing',
      initiatedByUser: new Types.ObjectId('645677573f56adad8ddcc091'),
      customAttributes: {},
      metadata: {
        firstRunAt: new Date('2023-02-01T12:00:00.000Z'),
      },
      status: TaskSteps.NOT_STARTED,
    };

    const createdTask = await service.createAndScheduleTask(
      '645677573f56adad8ddcc091',
      {
        taskType: objectSyncTask.taskType,
        name: objectSyncTask.name,
        firstRunAt: objectSyncTask.metadata.firstRunAt,
      },
    );

    expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
      ExchangeTypes.GENERAL,
      'task.scheduled',
      {
        taskType: 'OBJECT_SYNC',
        initiatedByUser: '645677573f56adad8ddcc091',
        taskName: objectSyncTask.name,
        firstRunAt: objectSyncTask.metadata.firstRunAt.toISOString(),
        customAttributes: {},
        payload: {},
        taskId: createdTask._id.toString(),
      },
    );
  });

  it('finds task by id', async () => {
    const taskId = new Types.ObjectId('6456826320d330954e4f9385');
    await taskModel.create({
      _id: taskId,
      initiatedByUser: '645677573f56adad8ddcc091',
      taskType: TaskTypes.OBJECT_SYNC,
      name: 'TEST',
      payload: {},
      metadata: {
        firstRunAt: new Date('2023-02-01T12:00:00.000Z'),
      },
    });
    const foundTask = await service.findById(taskId);

    const leanTask = foundTask.toObject();
    expect(leanTask).toMatchObject({
      _id: taskId,
      initiatedByUser: '645677573f56adad8ddcc091',
      taskType: TaskTypes.OBJECT_SYNC,
      name: 'TEST',
      metadata: expect.objectContaining({
        firstRunAt: new Date('2023-02-01T12:00:00.000Z'),
      }),
    });
  });

  it('sets failed task info', async () => {
    const now = new Date('2023-02-01T12:00:02.000Z');
    fakeTime({ now, fake: ['Date'] });
    const taskId = new Types.ObjectId('64568ea7e47990e9a21dcc26');
    await taskModel.create({
      _id: taskId,
      initiatedByUser: '645677573f56adad8ddcc091',
      taskType: TaskTypes.OBJECT_SYNC,
      name: 'Failing task',
      payload: {},
      metadata: {
        firstRunAt: new Date('2023-02-02T12:00:00.000Z'),
      },
    });

    const updatedTask = await service.setFailedTaskInfo(taskId, {
      taskType: 'OBJECT_SYNC',
      status: TaskSteps.FAILED,
      payload: {
        reason: 'Task failed to run',
      },
    });
    const leanUpdatedTask = updatedTask.toObject();
    expect(leanUpdatedTask).toMatchObject({
      _id: taskId,
      initiatedByUser: '645677573f56adad8ddcc091',
      taskType: TaskTypes.OBJECT_SYNC,
      name: 'Failing task',
      metadata: expect.objectContaining({
        lastFailedAt: now,
        lastFailReason: 'Task failed to run',
      }),
    });
  });

  it('handles data-fetch task result', async () => {
    const now = new Date('2023-03-12T12:00:02.000Z');
    fakeTime({ now, fake: ['Date'] });
    const taskId = new Types.ObjectId('64569195c710ff3cad6b4d7f');
    const dataFetchTask: DataFetchTask = {
      taskType: TaskTypes.DATA_FETCH,
      _id: taskId,
      initiatedByUser: new Types.ObjectId('645677573f56adad8ddcc091'),
      status: TaskSteps.PROCESSING,
      name: 'Datafetch1',
      payload: {
        data: [
          {
            sensor: new Types.ObjectId('645692be99aec85add4c90ed'),
            fileName: 'Testing-datafetch-taskname',
            dataId: 'id1',
          },
        ],
        dateTo: new Date('2023-02-01T12:00:02.000Z'),
        dateFrom: new Date('2023-01-20T12:00:02.000Z'),
      },
      customAttributes: {},
      metadata: {},
    };

    await dataFetchTaskModel.create(dataFetchTask);
    await service.handleDataFetchTaskResult(taskId, {
      taskId: taskId.toString(),
      taskType: 'DATA_FETCH',
      status: TaskSteps.DONE,
      payload: {
        sensors: [
          {
            sensorId: '645692be99aec85add4c90ed',
            fileName: 'duplicate_avoidance-Testing-datafetch-taskname.csv',
            dataId: 'id1',
            bucket: 'test',
            isPublicBucket: false,
            dateTo: '2023-02-01T12:00:02.000Z',
            dateFrom: '2023-01-20T12:00:02.000Z',
            filePath: 'data/duplicate_avoidance-Testing-datafetch-taskname.csv',
          },
        ],
        completedAt: '2023-03-12T12:00:01.000Z',
      },
    });

    const updatedEntity = await dataFetchTaskModel.findById(taskId).exec();
    const leanEntity = updatedEntity.toObject();

    expect(leanEntity).toMatchObject({
      _id: '64569195c710ff3cad6b4d7f',
      initiatedByUser: '645677573f56adad8ddcc091',
      taskType: TaskTypes.DATA_FETCH,
      name: 'Datafetch1',
      status: TaskSteps.DONE,
      metadata: expect.objectContaining({
        lastCompletedAt: new Date('2023-03-12T12:00:01.000Z'),
      }),
      payload: {
        data: [
          {
            sensor: '645692be99aec85add4c90ed',
            fileName: 'duplicate_avoidance-Testing-datafetch-taskname.csv',
            dataId: 'id1',
            bucket: 'test',
            filePath: 'data/duplicate_avoidance-Testing-datafetch-taskname.csv',
          },
        ],
        dateTo: new Date('2023-02-01T12:00:02.000Z'),
        dateFrom: new Date('2023-01-20T12:00:02.000Z'),
      },
    });
  });

  it('handles data-fetch task result with new files', async () => {
    const now = new Date('2023-03-12T12:00:02.000Z');
    fakeTime({ now, fake: ['Date'] });
    const taskId = new Types.ObjectId('64592e30a16f4a1d83a5945c');
    const dataFetchTask: DataFetchTask = {
      taskType: TaskTypes.DATA_FETCH,
      _id: taskId,
      initiatedByUser: new Types.ObjectId('645677573f56adad8ddcc091'),
      status: TaskSteps.PROCESSING,
      name: 'Datafetch1',
      payload: {
        data: [
          {
            sensor: new Types.ObjectId('645692be99aec85add4c90ed'),
            fileName: 'Testing-datafetch-taskname',
            dataId: 'id2',
          },
        ],
        dateTo: new Date('2023-02-01T12:00:02.000Z'),
        dateFrom: new Date('2023-01-20T12:00:02.000Z'),
      },
      customAttributes: {},
      metadata: {},
    };

    const fileStub = getFileStub({
      _id: new Types.ObjectId('645928a259d9844eb29e460a'),
    });
    const createdFile = await fileModel.create(fileStub);
    await dataFetchTaskModel.create(dataFetchTask);

    await service.handleDataFetchTaskResult(
      taskId,
      {
        taskId: taskId.toString(),
        taskType: 'DATA_FETCH',
        status: TaskSteps.DONE,
        payload: {
          sensors: [
            {
              sensorId: '645692be99aec85add4c90ed',
              fileName: 'duplicate_avoidance-Testing-datafetch-taskname.csv',
              bucket: 'test',
              dataId: 'id2',
              isPublicBucket: false,
              dateTo: '2023-02-01T12:00:02.000Z',
              dateFrom: '2023-01-20T12:00:02.000Z',
              filePath:
                'data/duplicate_avoidance-Testing-datafetch-taskname.csv',
            },
          ],
          completedAt: '2023-03-12T12:00:01.000Z',
        },
      },
      [createdFile],
    );

    const fileStub2 = getFileStub({
      _id: new Types.ObjectId('645be48efdfd7bb35a23ba9d'),
      name: 'some-filename.csv',
    });
    const createdFile2 = await fileModel.create(fileStub2);
    await service.handleDataFetchTaskResult(
      taskId,
      {
        taskId: taskId.toString(),
        taskType: 'DATA_FETCH',
        status: TaskSteps.DONE,
        payload: {
          sensors: [
            {
              sensorId: '6452a6971306581241dddd61',
              fileName: 'some-filename.csv',
              bucket: 'test',
              dataId: expect.any(String),
              isPublicBucket: false,
              dateTo: '2023-02-01T12:00:02.000Z',
              dateFrom: '2023-01-20T12:00:02.000Z',
              filePath: 'data/some-filename.csv',
            },
          ],
          completedAt: '2023-03-12T12:05:01.000Z',
        },
      },
      [createdFile2],
    );

    const updatedEntity = await dataFetchTaskModel.findById(taskId).exec();
    const leanEntity = updatedEntity.toObject();

    expect(leanEntity).toMatchObject({
      _id: '64592e30a16f4a1d83a5945c',
      initiatedByUser: '645677573f56adad8ddcc091',
      taskType: TaskTypes.DATA_FETCH,
      name: 'Datafetch1',
      status: TaskSteps.DONE,
      metadata: expect.objectContaining({
        lastCompletedAt: new Date('2023-03-12T12:05:01.000Z'),
      }),
      payload: {
        data: [
          {
            sensor: '645692be99aec85add4c90ed',
            fileName: 'duplicate_avoidance-Testing-datafetch-taskname.csv',
            bucket: 'test',
            dataId: 'id2',
            filePath: 'data/duplicate_avoidance-Testing-datafetch-taskname.csv',
          },
          {
            sensor: '6452a6971306581241dddd61',
            fileName: 'some-filename.csv',
            bucket: 'test',
            filePath: 'data/some-filename.csv',
          },
        ],
        dateTo: new Date('2023-02-01T12:00:02.000Z'),
        dateFrom: new Date('2023-01-20T12:00:02.000Z'),
      },
    });
  });
});
