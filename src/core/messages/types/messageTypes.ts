import { TaskStatus } from '../../../models/FileTask';

export interface BaseMessage<T> {
  scheduledAt: string;
  content: T;
}

export interface FileDownloadScheduledMessage {
  taskId: string;
  dateFrom: string;
  dateTo: string;
  sensors: {
    id: string;
    managedObjectId: string;
    fragmentType: string;
    fileName?: string;
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
  data?: {
    sensorId: string;
    filePath?: string;
    fileName?: string;
    pathSeparator?: string;
  }[];
}

export interface MessageTypes {
  'File.DownloadScheduled': FileDownloadScheduledMessage;
  'File.DownloadStatus': FileDownloadStatusMessage;
}
