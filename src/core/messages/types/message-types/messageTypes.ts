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
import { FileDeletionMessage, FileVisibilityStateMessage } from './file/types';
import { TaskModeMessage } from './task/mode';

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
  'task.mode': TaskModeMessage;
  'user.user': UserMessage;
  'file.status.deletion': FileDeletionMessage;
  'file.status.visibility.state': FileVisibilityStateMessage;
}
