import { CreateDataFetchDto } from '../../core/tasks/dto/input/create-datafetch-task.dto';
import { Task, TaskMode, TaskSteps, TaskTypes } from '../../models';
import { Types } from 'mongoose';
import { CreateObjectSyncDto } from '../../core/tasks/dto/input/create-objectsync-task.dto';
import { CreateDataUploadTaskDto } from '../../core/tasks/dto/input/create-dataupload-task.dto';

interface DataFetchTaskSpecificOverrides {
  /**
   * Overrides taskPayloadEntities if specified
   */
  taskPayload?: Partial<CreateDataFetchDto['taskPayload']>;
  taskPayloadEntities?: CreateDataFetchDto['taskPayload']['entities'];
}

interface DataUploadTaskSpecificOverrides {
  fileIds?: Partial<CreateDataUploadTaskDto['taskPayload']['fileIds']>;
}
export function getCreateDataFetchTaskStub(
  override?: Partial<CreateDataFetchDto>,
  options: DataFetchTaskSpecificOverrides = {},
): CreateDataFetchDto {
  return {
    name: 'TestDataFetchTask',
    taskType: TaskTypes.DATA_FETCH,
    firstRunAt: new Date('2023-05-01T00:00:00.000Z'),
    taskPayload: {
      dateTo: new Date('2023-04-20T00:00:00.000Z'),
      dateFrom: new Date('2023-04-25T00:00:00.000Z'),
      entityType: 'SENSOR',
      entities: options.taskPayloadEntities ?? [
        {
          id: new Types.ObjectId('647df42e190ff74b71336403'),
          fileName: 'DataFetchFile1',
        },
      ],
      ...options.taskPayload,
    },
    ...override,
  };
}

export function getCreateObjectSyncTaskStub(
  override?: Partial<CreateObjectSyncDto>,
): CreateObjectSyncDto {
  return {
    name: 'TestObjectSyncTask',
    taskType: TaskTypes.OBJECT_SYNC,
    firstRunAt: new Date('2023-05-02T00:00:00.000Z'),
    ...override,
  };
}

export function getCreateDataUploadTaskStub(
  override?: Partial<CreateDataUploadTaskDto>,
  options: DataUploadTaskSpecificOverrides = {},
): CreateDataUploadTaskDto {
  return {
    name: 'TestDataUploadTask',
    taskType: TaskTypes.DATA_UPLOAD,
    firstRunAt: new Date('2023-05-03T00:00:00.000Z'),
    taskPayload: {
      fileIds: options.fileIds ?? [new Types.ObjectId()],
    },
    ...override,
  };
}

export function getTaskStub(
  taskType: TaskTypes,
  override?: Partial<Task>,
): Task {
  return {
    status: TaskSteps.PROCESSING,
    mode: TaskMode.ENABLED,
    name: 'TestingTask',
    taskType,
    initiatedByUser: new Types.ObjectId('647def0431e60c140e279c59'),
    metadata: {
      firstRunAt: new Date('2023-05-05T00:00:00.000Z'),
    },
    customAttributes: {},
    ...override,
  };
}
