import { String, Record, Array, Partial, Static, Boolean } from 'runtypes';
import { ISOString } from '../common';

const MessageSensorInfo = Record({
  id: String,
  managedObjectId: String,
}).And(
  Partial({
    fragmentType: String,
    fragmentSeries: String,
  }),
);

const MessagePayloadData = Record({
  sensor: MessageSensorInfo,
}).And(
  Partial({
    fileName: String,
    dataId: String,
  }),
);

export const DataFetchTaskMessagePayloadRuntype = Record({
  dateFrom: ISOString,
  data: Array(MessagePayloadData),
}).And(
  Partial({
    dateTo: ISOString,
  }),
);

const TaskResultSensor = Record({
  sensorId: String,
  bucket: String,
  isPublicBucket: Boolean,
  fileName: String,
  dateFrom: String,
  dateTo: String,
}).And(
  Partial({
    dataId: String,
    filePath: String,
    fileURL: String,
  }),
);

export const DataFetchTaskResultStatusPayloadRuntype = Record({
  sensors: Array(TaskResultSensor),
}).And(
  Partial({
    completedAt: String,
  }),
);

export type DataFetchTaskMessagePayload = Static<
  typeof DataFetchTaskMessagePayloadRuntype
>;

export type DataFetchTaskResultStatusPayload = Static<
  typeof DataFetchTaskResultStatusPayloadRuntype
>;

export type DataFetchTaskResultSensor = Static<typeof TaskResultSensor>;
