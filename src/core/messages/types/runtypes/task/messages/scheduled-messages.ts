import {
  Number,
  Partial,
  Record,
  Runtype,
  Static,
  String,
  Union,
} from 'runtypes';
import { ISOString, TaskTypes, TaskTypesRuntype } from '../../common';
import { DataUploadTaskMessagePayloadRuntype } from '../data-upload';
import { DataFetchTaskMessagePayloadRuntype } from '../data-fetch';

export function createTaskScheduledMessage<T extends TaskTypes, P>(
  taskType: Runtype<T>,
  payload: Runtype<P>,
) {
  return Record({
    taskId: String,
    taskType: taskType,
    taskName: String,
    initiatedByUser: String,
    payload,
  }).And(
    Partial({
      firstRunAt: ISOString,
      periodicData: Record({
        pattern: String,
        windowDurationSeconds: Number.optional(),
      }),
    }),
  );
}

export const GeneralTaskScheduledMessageRuntype = createTaskScheduledMessage(
  TaskTypesRuntype,
  Record({}),
);

export const DataFetchTaskScheduledMessageRuntype = createTaskScheduledMessage(
  TaskTypesRuntype.alternatives[0],
  DataFetchTaskMessagePayloadRuntype,
);

export const DataUploadTaskScheduledMessageRuntype = createTaskScheduledMessage(
  TaskTypesRuntype.alternatives[1],
  DataUploadTaskMessagePayloadRuntype,
);

export const ObjectSyncTaskScheduledMessageRuntype = createTaskScheduledMessage(
  TaskTypesRuntype.alternatives[2],
  Record({}),
);

export const TaskScheduledMessageAlternativesRuntype = Union(
  DataFetchTaskScheduledMessageRuntype,
  DataUploadTaskScheduledMessageRuntype,
  ObjectSyncTaskScheduledMessageRuntype,
);

export type GeneralTaskScheduledMessage = Static<
  typeof GeneralTaskScheduledMessageRuntype
>;

export type DataUploadTaskScheduledMessage = Static<
  typeof DataUploadTaskScheduledMessageRuntype
>;
export type DataFetchTaskScheduledMessage = Static<
  typeof DataFetchTaskScheduledMessageRuntype
>;
export type ObjectSyncTaskScheduledMessage = Static<
  typeof ObjectSyncTaskScheduledMessageRuntype
>;

export type TaskScheduledMessageAlternatives = Static<
  typeof TaskScheduledMessageAlternativesRuntype
>;

export type TaskScheduledMessagePayloadAlternatives =
  TaskScheduledMessageAlternatives['payload'];
