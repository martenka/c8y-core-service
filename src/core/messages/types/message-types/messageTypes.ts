import { TaskStatus } from '../../../../models/FileTask';
import { TaskScheduledMessage } from './task/types';

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
    bucket: string;
    filePath?: string;
    fileURL?: string;
    fileName: string;
    pathSeparator?: string;
  }[];
}

export interface MessageTypes {
  'File.DownloadScheduled': FileDownloadScheduledMessage;
  'File.DownloadStatus': FileDownloadStatusMessage;
  'task.scheduled': TaskScheduledMessage;
}
