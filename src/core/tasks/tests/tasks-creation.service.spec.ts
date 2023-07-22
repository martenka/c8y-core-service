import { Test } from '@nestjs/testing';

import { Connection, Types } from 'mongoose';
import {
  DataFetchTask,
  DataFetchTaskModel,
  DataFetchTaskSchema,
  File,
  FileModel,
  FileSchema,
  Group,
  ObjectSyncTask,
  ObjectSyncTaskModel,
  ObjectSyncTaskSchema,
  Sensor,
  TaskSteps,
  TaskTypes,
} from '../../../models';
import {
  DataUploadTask,
  DataUploadTaskModel,
  DataUploadTaskSchema,
} from '../../../models/task/data-upload-task';

import { getModelToken } from '@nestjs/mongoose';
import { TaskCreationService } from '../task-creation.service';

import { Logger } from '@nestjs/common';
import { FileWithSensorProblem } from '../../files/types/types';
import { GroupModel, GroupSchema } from '../../../models/Group';
import { SensorModel, SensorSchema } from '../../../models/Sensor';
import { FilesService } from '../../files/files.service';
import { CreateDataFetchDto } from '../dto/input/create-datafetch-task.dto';
import { getSensorStub } from '../../../tests/stubs/sensor';
import { omit } from '../../../utils/helpers';
import { getFileStub } from '../../../tests/stubs/file';
import { CreateDataUploadTaskDto } from '../dto/input/create-dataupload-task.dto';
import { Platform } from '../../../global/tokens';
import { CustomException } from '../../../global/exceptions/custom.exception';
import { CreateObjectSyncDto } from '../dto/input/create-objectsync-task.dto';
import {
  setupTest,
  WithServiceSetupTestResult,
} from '../../../../test/setup/setup';

type TasksCreationServiceExtensions = WithServiceSetupTestResult<{
  models: {
    objectSyncTaskModel: ObjectSyncTaskModel;
    dataFetchTaskModel: DataFetchTaskModel;
    dataUploadTaskModel: DataUploadTaskModel;
    groupModel: GroupModel;
    fileModel: FileModel;
    sensorModel: SensorModel;
  };
  services: {
    service: TaskCreationService;
  };
  initiatedByUser: Types.ObjectId;
}>;

describe('TasksCreationService', () => {
  function withTest(
    callback: (params: TasksCreationServiceExtensions) => Promise<void>,
  ): () => Promise<void> {
    async function setupFn(
      connection: Connection,
    ): Promise<TasksCreationServiceExtensions> {
      const dataFetchTaskModel = connection.model(
        DataFetchTask.name,
        DataFetchTaskSchema,
      );
      const dataUploadTaskModel = connection.model(
        DataUploadTask.name,
        DataUploadTaskSchema,
      );
      const objectSyncTaskModel = connection.model(
        ObjectSyncTask.name,
        ObjectSyncTaskSchema,
      );
      const groupModel = connection.model(Group.name, GroupSchema);
      const fileModel = connection.model(File.name, FileSchema);
      const sensorModel = connection.model(Sensor.name, SensorSchema);
      const initiatedByUser = new Types.ObjectId('64575f80f5fac24db4046091');

      const mockFilesService = {
        getFilesUnsuitableForUpload: jest
          .fn()
          .mockImplementation(
            async (
              fileIds: Types.ObjectId[],
            ): Promise<FileWithSensorProblem[]> => {
              if (
                fileIds
                  .map((id) => id.toString())
                  .includes('64577fe5f095520f6d635289')
              ) {
                return fileIds.map((file) => ({
                  fileId: file.toString(),
                  sensor: {
                    sensorId: '64577aeac35e034a2b9f729b',
                    problem: 'valueFragmentDisplayName not present',
                  },
                }));
              }

              return [];
            },
          ),
      };

      const module = await Test.createTestingModule({
        providers: [
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
          { provide: FilesService, useValue: mockFilesService },
          TaskCreationService,
        ],
      })
        .setLogger(new Logger())
        .compile();

      const service = module.get<TaskCreationService>(TaskCreationService);
      await module.init();

      return {
        models: {
          objectSyncTaskModel,
          dataFetchTaskModel,
          dataUploadTaskModel,
          sensorModel,
          fileModel,
          groupModel,
        },
        services: {
          service,
        },
        initiatedByUser,
      };
    }

    return setupTest<TasksCreationServiceExtensions>(setupFn, callback);
  }

  afterEach(async () => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it.concurrent(
    'creates data-fetch task entity',
    withTest(async ({ models, services }) => {
      const sensorId = new Types.ObjectId('64575ef7e8c098ff0133b376');
      const initiatedByUser = new Types.ObjectId('64575f80f5fac24db4046091');
      const sensor = getSensorStub({ _id: sensorId });
      await models.sensorModel.create(sensor);

      const createDataFetchTaskDto: CreateDataFetchDto = {
        name: 'DataFetchTask123',
        taskType: TaskTypes.DATA_FETCH,
        firstRunAt: new Date('2023-04-12T12:00:00.000Z'),
        periodicData: {
          pattern: '0 0 0 ? * * *',
          fetchDurationSeconds: 0,
        },
        taskPayload: {
          dateFrom: new Date('2023-04-01T12:00:00.000Z'),
          dateTo: new Date('2023-04-10T12:00:00.000Z'),
          entityType: 'SENSOR',
          entities: [{ id: sensorId, fileName: 'Test-datafetch-name' }],
        },
      };

      const createdDataFetchTask = await services.service.createTask({
        ...createDataFetchTaskDto,
        initiatedByUser,
      });
      const leanTask = createdDataFetchTask.toObject();
      expect(leanTask).toMatchObject({
        _id: createdDataFetchTask._id.toString(),
        name: 'DataFetchTask123',
        initiatedByUser: initiatedByUser.toString(),
        status: 'NOT_STARTED',
        metadata: expect.objectContaining({
          firstRunAt: new Date('2023-04-12T12:00:00.000Z'),
          periodicData: {
            pattern: '0 0 0 ? * * *',
            fetchDurationSeconds: 0,
          },
        }),
        payload: expect.objectContaining({
          dateFrom: new Date('2023-04-01T12:00:00.000Z'),
          dateTo: new Date('2023-04-10T12:00:00.000Z'),
          data: [
            {
              sensor: expect.objectContaining({
                _id: sensorId.toString(),
              }),
              dataId: expect.any(String),
              fileName: 'Test-datafetch-name',
            },
          ],
        }),
      });
    }),
  );

  it.concurrent(
    'creates data-fetch task entity from group',
    withTest(async ({ models, services, initiatedByUser }) => {
      const sensor1Id = new Types.ObjectId('645768b7de625988629d2994');
      const sensor2Id = new Types.ObjectId('645768bd6d574a24d8776eba');
      const sensor3Id = new Types.ObjectId('645768c475847015f7c130a0');
      const sensor1 = getSensorStub({ _id: sensor1Id });
      const sensor2 = getSensorStub({ _id: sensor2Id });
      const sensor3 = getSensorStub({ _id: sensor3Id });
      await models.sensorModel.create([sensor1, sensor2, sensor3]);

      const groupEntity = await models.groupModel.create({
        name: 'Test group',
        sensors: [sensor1Id, sensor2Id, sensor3Id],
      });

      const createDataFetchTaskDto: CreateDataFetchDto = {
        name: 'DataFetchTask345',
        taskType: TaskTypes.DATA_FETCH,
        firstRunAt: new Date('2023-04-11T12:00:00.000Z'),
        taskPayload: {
          dateFrom: new Date('2023-04-02T12:00:00.000Z'),
          dateTo: new Date('2023-04-09T12:00:00.000Z'),
          entityType: 'GROUP',
          entities: [{ id: groupEntity._id, fileName: 'Group-filename' }],
        },
      };

      const createdDataFetchTask = await services.service.createTask({
        ...createDataFetchTaskDto,
        initiatedByUser,
      });

      const leanTask = createdDataFetchTask.toObject();
      expect(leanTask).toMatchObject({
        _id: createdDataFetchTask._id.toString(),
        name: 'DataFetchTask345',
        initiatedByUser: initiatedByUser.toString(),
        status: 'NOT_STARTED',
        metadata: {
          firstRunAt: new Date('2023-04-11T12:00:00.000Z'),
        },
        payload: expect.objectContaining({
          dateFrom: new Date('2023-04-02T12:00:00.000Z'),
          dateTo: new Date('2023-04-09T12:00:00.000Z'),
          data: [
            {
              sensor: {
                ...omit(sensor1, '_id'),
                _id: sensor1Id.toString(),
                __v: 0,
              },
              dataId: expect.any(String),
            },
            {
              sensor: {
                ...omit(sensor2, '_id'),
                _id: sensor2Id.toString(),
                __v: 0,
              },
              dataId: expect.any(String),
            },
            {
              sensor: {
                ...omit(sensor3, '_id'),
                _id: sensor3Id.toString(),
                __v: 0,
              },
              dataId: expect.any(String),
            },
          ],
          group: groupEntity._id.toString(),
        }),
      });
    }),
  );

  it.concurrent(
    'creates data-upload task',
    withTest(async ({ models, services, initiatedByUser }) => {
      const sensorId = new Types.ObjectId('6457790364a624b3af0d122e');
      const sensorStub = getSensorStub({
        _id: sensorId,
        description: 'Test sensor description',
      });
      await models.sensorModel.create(sensorStub);

      const fileStub = getFileStub({
        _id: new Types.ObjectId('645777e41c01a55dd8974d1d'),
        metadata: {
          sensors: [sensorId],
          dateFrom: new Date('2023-01-03T12:00:00.000Z'),
          dateTo: new Date('2023-01-06T12:00:00.000Z'),
          managedObjectName: "AA'BB'C1",
          managedObjectId: '100',
          valueFragments: [
            { type: 'C8y_Temperature', description: 'Temperature' },
          ],
        },
        description: 'File description',
        customAttributes: { test: 'value' },
      });
      const fileEntity = await models.fileModel.create(fileStub);

      const createDataUploadTaskDto: CreateDataUploadTaskDto = {
        name: 'DataUploadTest',
        taskType: TaskTypes.DATA_UPLOAD,
        firstRunAt: new Date('2023-04-13T12:00:00.000Z'),
        taskPayload: {
          fileIds: [fileEntity._id],
        },
      };

      const taskEntity = await services.service.createTask({
        ...createDataUploadTaskDto,
        initiatedByUser,
      });

      const leanTaskEntity = taskEntity.toObject();
      expect(leanTaskEntity).toMatchObject({
        _id: expect.any(String),
        initiatedByUser: initiatedByUser.toString(),
        name: 'DataUploadTest',
        status: TaskSteps.NOT_STARTED,
        metadata: {
          firstRunAt: new Date('2023-04-13T12:00:00.000Z'),
        },
        payload: {
          platform: {
            platformIdentifier: Platform.CKAN,
          },
          files: [
            {
              fileId: fileStub._id.toString(),
              fileName: fileStub.name,
              storage: {
                bucket: fileStub.storage.bucket,
                path: fileStub.storage.path,
              },
              metadata: {
                dateFrom: fileStub.metadata.dateFrom,
                dateTo: fileStub.metadata.dateTo,
                managedObjectName: sensorStub.managedObjectName,
                managedObjectId: sensorStub.managedObjectId,
                fileDescription: fileStub.description,
                valueFragmentType: sensorStub.valueFragmentType,
                valueFragmentDescription: sensorStub.valueFragmentDisplayName,
                sensorDescription: sensorStub.description,
                type: sensorStub.type,
              },
              customAttributes: {
                ...sensorStub.customAttributes,
                ...fileStub.customAttributes,
              },
            },
          ],
        },
      });
    }),
  );

  it.concurrent(
    'does not allow creating data-upload task when valueFragment description is not present',
    withTest(async ({ models, services, initiatedByUser }) => {
      const sensorId = new Types.ObjectId('64577aeac35e034a2b9f729b');
      const sensorStub = getSensorStub({
        _id: sensorId,
        valueFragmentDisplayName: undefined,
        description: 'Test sensor description',
      });

      await models.sensorModel.create(sensorStub);

      const fileStub = getFileStub({
        _id: new Types.ObjectId('64577fe5f095520f6d635289'),
        metadata: {
          sensors: [sensorId],
          dateFrom: new Date('2023-01-03T12:00:00.000Z'),
          dateTo: new Date('2023-01-06T12:00:00.000Z'),
          managedObjectName: "AA'BB'C1",
          managedObjectId: '100',
          valueFragments: [
            { type: 'C8y_Temperature', description: 'Temperature' },
          ],
        },
        description: 'File description',
        customAttributes: { test: 'value' },
      });
      const fileEntity = await models.fileModel.create(fileStub);

      const createDataUploadTaskDto: CreateDataUploadTaskDto = {
        name: 'DataUploadTest',
        taskType: TaskTypes.DATA_UPLOAD,
        firstRunAt: new Date('2023-04-13T13:00:00.000Z'),
        taskPayload: {
          fileIds: [fileEntity._id],
        },
      };

      await expect(
        services.service.createTask({
          ...createDataUploadTaskDto,
          initiatedByUser,
        }),
      ).rejects.toThrowError(
        new CustomException(
          'Unable to upload files, please check that all sensors in all files of this task payload have valueFragmentDescription/DisplayName field present',
        ),
      );
    }),
  );

  it.concurrent(
    'creates object-sync task',
    withTest(async ({ services, initiatedByUser }) => {
      const createObjectSyncTaskDto: CreateObjectSyncDto = {
        taskType: TaskTypes.OBJECT_SYNC,
        firstRunAt: new Date('2023-04-15T15:00:00.000Z'),
      };

      const taskEntity = await services.service.createTask({
        ...createObjectSyncTaskDto,
        initiatedByUser,
      });

      const leanTaskEntity = taskEntity.toObject();
      expect(leanTaskEntity).toMatchObject({
        _id: expect.any(String),
        name: expect.stringMatching(/ObjectSync-/),
        initiatedByUser: initiatedByUser.toString(),
        status: 'NOT_STARTED',
      });
    }),
  );
});
