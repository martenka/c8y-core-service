import { Type } from '@nestjs/common';
import { DataFetchTaskType } from './DataFetchTask';
import { ObjectSyncTaskType } from './ObjectSyncTask';

export enum TaskSteps {
  NOT_STARTED = 'NOT_STARTED',
  IN_QUEUE = 'IN_QUEUE',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export enum TaskTypes {
  DATA_FETCH = 'DATA_FETCH',
  OBJECT_SYNC = 'OBJECT_SYNC',
}

export interface TaskMap {
  [TaskTypes.DATA_FETCH]: DataFetchTaskType;
  [TaskTypes.OBJECT_SYNC]: ObjectSyncTaskType;
}

export type TaskStatus = keyof typeof TaskSteps;
export type TaskTypesMap<T extends Type<unknown> = Type> = Record<
  keyof typeof TaskTypes,
  T
>;
