import {
  DataFetchPayloadType,
  SensorDataType,
  TaskPeriodicDataType,
  TaskSteps,
  TaskType,
  TaskTypes,
} from '../../../../../models';

export interface DataFetchTaskMessagePayload
  extends Pick<DataFetchPayloadType, 'dateFrom' | 'dateTo'> {
  data: (Pick<SensorDataType, 'fileName'> & {
    sensor: {
      id: string;
      managedObjectId: string;
      fragmentType: string;
    };
  })[];
}

export interface TaskScheduledMessage<P extends object = object>
  extends Pick<TaskType, 'taskType' | 'customAttributes'> {
  taskId: string;
  taskName: string;
  initiatedByUser: string;
  firstRunAt?: string;
  periodicData?: Pick<TaskPeriodicDataType, 'pattern' | 'fetchDurationSeconds'>;
  payload: P;
}

export interface DataFetchTaskResultStatusPayload {
  sensors: {
    sensorId: string;
    bucket: string;
    isPublicBucket: boolean;
    filePath?: string;
    fileURL?: string;
    fileName: string;
    dateFrom: string;
    dateTo: string;
  }[];
}

export interface TaskFailedMessagePayload {
  reason: string;
}

export interface TaskStatusMessage<
  P extends object = object,
  S extends TaskSteps = TaskSteps,
> {
  taskId: string;
  taskType: keyof typeof TaskTypes;
  status: S;
  payload: P;
}

export type DataFetchTaskResult =
  TaskStatusMessage<DataFetchTaskResultStatusPayload>;
