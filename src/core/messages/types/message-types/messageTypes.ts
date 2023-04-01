import {
  TaskFailedMessagePayload,
  TaskScheduledMessage,
  TaskStatusMessage,
} from './task/types';
import { UserMessage } from './user/types';
import {
  ObjectSyncTaskResultPayload,
  ObjectSyncTaskStatusPayload,
} from './task/object-sync';
import { TaskSteps } from '../../../../models';

export interface BaseMessage<T> {
  scheduledAt: string;
  content: T;
}

export type TaskFailedMessage = TaskStatusMessage<TaskFailedMessagePayload>;

export type ObjectSyncTaskStatusMessage = TaskStatusMessage<
  ObjectSyncTaskStatusPayload,
  TaskSteps.PROCESSING
>;
export type ObjectSyncTaskResultMessage = TaskStatusMessage<
  ObjectSyncTaskResultPayload,
  TaskSteps.DONE
>;

export interface MessageTypes {
  'task.scheduled': TaskScheduledMessage;
  'task.status.failed': TaskFailedMessage;
  'task.status': TaskStatusMessage;
  'user.user': UserMessage;
}
