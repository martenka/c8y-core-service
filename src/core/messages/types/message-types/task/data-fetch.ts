import { DataFetchPayloadType, SensorDataType } from '../../../../../models';
import { TaskStatusMessage } from './types';

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

export type DataFetchTaskResult =
  TaskStatusMessage<DataFetchTaskResultStatusPayload>;
