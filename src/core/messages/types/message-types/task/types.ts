import {
  DataFetchPayloadType,
  SensorDataType,
  TaskPeriodicDataType,
  TaskStatus,
  TaskType,
  TaskTypes,
} from '../../../../../models';

export interface DataFetchTaskMessagePayload
  extends Pick<DataFetchPayloadType, 'dateFrom' | 'dateTo'> {
  data: (Pick<SensorDataType, 'fileName'> & {
    sensor: {
      managedObjectId: number;
      fragmentType: string;
    };
  })[];
}

export interface TaskScheduledMessage<P extends object = object>
  extends Pick<TaskType, 'taskType' | 'initiatedByUser' | 'customAttributes'> {
  taskId: string;
  periodicData?: Pick<
    TaskPeriodicDataType,
    'pattern' | 'fetchDuration' | 'firstRunAt'
  >;
  payload: P;
}

export interface DataFetchTaskMessageStatusPayload {
  sensorId: string;
  bucket: string;
  filePath?: string;
  fileURL?: string;
  fileName: string;
}

export interface TaskStatusMessage<P extends object = object> {
  taskId: string;
  taskType: keyof typeof TaskTypes;
  status: TaskStatus;
  payload: P;
}
