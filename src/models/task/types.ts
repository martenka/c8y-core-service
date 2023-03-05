import { Type } from '@nestjs/common';

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

export type TaskStatus = keyof typeof TaskSteps;
export type TaskTypesMap<T extends Type<unknown> = Type> = Record<
  keyof typeof TaskTypes,
  T
>;
