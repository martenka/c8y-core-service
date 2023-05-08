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

export interface DataFetchTaskResultFile {
  sensorId: string;
  bucket: string;
  isPublicBucket: boolean;
  /**
   * Path inside the bucket including the filename
   */
  filePath?: string;
  fileURL?: string;
  /**
   * Filename excluding path and bucket
   */
  fileName: string;
  dateFrom: string;
  dateTo: string;
}

export interface DataFetchTaskResultStatusPayload {
  sensors: DataFetchTaskResultFile[];
  completedAt?: string;
}

export type DataFetchTaskResult =
  TaskStatusMessage<DataFetchTaskResultStatusPayload>;
