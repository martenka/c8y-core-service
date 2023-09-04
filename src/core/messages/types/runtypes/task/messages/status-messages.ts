import { Partial, Record, Runtype, Static, String, Union } from 'runtypes';
import { DataFetchTaskResultStatusPayloadRuntype } from '../data-fetch';
import {
  ISOString,
  TaskModeRuntype,
  TaskStatus,
  TaskStatusRuntype,
  TaskTypes,
  TaskTypesRuntype,
} from '../../common';
import {
  ObjectSyncTaskResultPayloadRuntype,
  ObjectSyncTaskStatusPayloadRuntype,
} from '../object-sync';

interface TaskStatusDefaults<
  T extends TaskTypes = TaskTypes,
  S extends TaskStatus = TaskStatus,
> {
  taskType: Runtype<T>;
  status?: Runtype<S>;
}

export function createTaskStatusMessage<
  P,
  T extends TaskTypes,
  S extends TaskStatus,
>(payload: Runtype<P>, defaults: TaskStatusDefaults<T, S>) {
  return Record({
    taskId: String,
    taskType: defaults.taskType,
    status: defaults?.status ?? TaskStatusRuntype,
    payload,
  }).And(
    Partial({
      mode: TaskModeRuntype,
      timestamp: ISOString,
      nextRunAt: ISOString,
    }),
  );
}

export const TaskFailedMessagePayloadRuntype = Record({
  reason: String,
});

export const TaskFailedMessageRuntype = createTaskStatusMessage(
  TaskFailedMessagePayloadRuntype,
  { taskType: TaskTypesRuntype, status: TaskStatusRuntype.alternatives[5] },
);
export const ObjectSyncTaskStatusMessageRuntype = createTaskStatusMessage(
  ObjectSyncTaskStatusPayloadRuntype,
  { taskType: TaskTypesRuntype.alternatives[2] },
);
export const ObjectSyncTaskResultStatusMessageRuntype = createTaskStatusMessage(
  ObjectSyncTaskResultPayloadRuntype,
  { taskType: TaskTypesRuntype.alternatives[2] },
);
export const DataFetchTaskStatusMessageRuntype = createTaskStatusMessage(
  DataFetchTaskResultStatusPayloadRuntype,
  { taskType: TaskTypesRuntype.alternatives[0] },
);

export const DataUploadTaskStatusMessageRuntype = createTaskStatusMessage(
  Record({}),
  { taskType: TaskTypesRuntype.alternatives[1] },
);

export const TaskStatusMessageAlternativesRuntype = Union(
  DataFetchTaskStatusMessageRuntype,
  DataUploadTaskStatusMessageRuntype,
  ObjectSyncTaskStatusMessageRuntype,
  ObjectSyncTaskResultStatusMessageRuntype,
  /*  ,
  TaskFailedMessageRuntype,*/
);
export const GeneralTaskStatusMessageRuntype = createTaskStatusMessage(
  Record({}),
  { taskType: TaskTypesRuntype },
);

export type TaskFailedMessage = Static<typeof TaskFailedMessageRuntype>;
export type GeneralTaskStatusMessage = Static<
  typeof GeneralTaskStatusMessageRuntype
>;
export type TaskStatusMessageAlternatives = Static<
  typeof TaskStatusMessageAlternativesRuntype
>;
export type BaseTaskStatusMessageFields = Omit<
  GeneralTaskStatusMessage,
  'payload'
>;
