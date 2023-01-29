import { TaskStatus } from '../../../models/FileTask';

export interface BaseMessage<T> {
  scheduledAt: string;
  data: T;
}

export interface FileDownloadScheduledMessage {
  taskId: string;
  dateFrom: string;
  dateTo: string;
  sensors: {
    managedObjectId: number;
    sensorFragmentType: string;
    filename?: string;
  }[];
  credentials: {
    username: string;
    password: string;
    tenantID: string;
    tenantURL: string;
  };
}

export interface FileDownloadStatusMessage {
  taskId: string;
  status: TaskStatus;
  filePath?: string;
}

export interface MessageTypes {
  'File.DownloadScheduled': FileDownloadScheduledMessage;
  'File.DownloadStatus': FileDownloadStatusMessage;
}
