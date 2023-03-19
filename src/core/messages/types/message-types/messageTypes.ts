import {
  TaskFailedMessagePayload,
  TaskScheduledMessage,
  TaskStatusMessage,
} from './task/types';
import { UserMessage } from './user/types';

export interface BaseMessage<T> {
  scheduledAt: string;
  content: T;
}

export type TaskFailedMessage = TaskStatusMessage<TaskFailedMessagePayload>;

export interface MessageTypes {
  'task.scheduled': TaskScheduledMessage;
  'task.status.failed': TaskFailedMessage;
  'task.status': TaskStatusMessage;
  'user.user': UserMessage;
}
