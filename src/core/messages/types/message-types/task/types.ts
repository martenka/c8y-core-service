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
      id: string;
      managedObjectId: number;
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
    filePath?: string;
    fileURL?: string;
    fileName: string;
  }[];
}

export interface TaskFailedMessagePayload {
  reason: string;
}

export interface TaskStatusMessage<P extends object = object> {
  taskId: string;
  taskType: keyof typeof TaskTypes;
  status: TaskStatus;
  payload: P;
}
