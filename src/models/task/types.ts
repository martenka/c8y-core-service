import { Type } from '@nestjs/common';
import { DataFetchTaskDocument, DataFetchTaskType } from './data-fetch-task';
import { ObjectSyncTaskDocument, ObjectSyncTaskType } from './object-sync-task';
import { DataUploadTaskDocument, DataUploadTaskType } from './data-upload-task';

export enum TaskSteps {
  NOT_STARTED = 'NOT_STARTED',
  IN_QUEUE = 'IN_QUEUE',
  WAITING_NEXT_CYCLE = 'WAITING_NEXT_CYCLE',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  FAILED = 'FAILED',
  DISABLED = 'DISABLED',
}

export enum TaskMode {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

export enum TaskTypes {
  DATA_FETCH = 'DATA_FETCH',
  DATA_UPLOAD = 'DATA_UPLOAD',
  OBJECT_SYNC = 'OBJECT_SYNC',
}

export enum VisibilityState {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export type TaskDocumentSubtypes =
  | DataFetchTaskDocument
  | ObjectSyncTaskDocument
  | DataUploadTaskDocument;

export interface TaskMap {
  [TaskTypes.DATA_FETCH]: DataFetchTaskType;
  [TaskTypes.OBJECT_SYNC]: ObjectSyncTaskType;
  [TaskTypes.DATA_UPLOAD]: DataUploadTaskType;
}

export type TaskStatus = keyof typeof TaskSteps;
export type TaskTypesMap<T extends Type<unknown> = Type> = Record<
  keyof typeof TaskTypes,
  T
>;
