import { UserMessageRuntype } from './user/user';
import {
  FileDeletionMessageRuntype,
  FileVisibilityStateMessageRuntype,
  VisibilityStateResultMessageRuntype,
} from './file/file';
import { TaskModeMessageRuntype } from './task/mode';
import {
  DataFetchTaskStatusMessageRuntype,
  DataUploadTaskStatusMessageRuntype,
  ObjectSyncTaskResultStatusMessageRuntype,
  ObjectSyncTaskStatusMessageRuntype,
  TaskFailedMessageRuntype,
  GeneralTaskStatusMessageRuntype,
  TaskStatusMessageAlternativesRuntype,
} from './task/messages/status-messages';
import {
  DataFetchTaskScheduledMessageRuntype,
  DataUploadTaskScheduledMessageRuntype,
  ObjectSyncTaskScheduledMessageRuntype,
  GeneralTaskScheduledMessageRuntype,
  TaskScheduledMessageAlternativesRuntype,
} from './task/messages/scheduled-messages';
import { Static } from 'runtypes';
import { TaskTypes } from './common';

export const MessagesValidationMap = {
  'task.scheduled': {
    message: GeneralTaskScheduledMessageRuntype,
    alternatives: TaskScheduledMessageAlternativesRuntype,
  },
  'task.scheduled.data_fetch': {
    message: DataFetchTaskScheduledMessageRuntype,
  },
  'task.scheduled.data_upload': {
    message: DataUploadTaskScheduledMessageRuntype,
  },
  'task.scheduled.object_sync': {
    message: ObjectSyncTaskScheduledMessageRuntype,
  },
  'task.status.data_fetch.result': {
    message: DataFetchTaskStatusMessageRuntype,
  },
  'task.status.data_upload.result': {
    message: DataUploadTaskStatusMessageRuntype,
  },
  'task.status.object_sync': { message: ObjectSyncTaskStatusMessageRuntype },
  'task.status.object_sync.result': {
    message: ObjectSyncTaskResultStatusMessageRuntype,
  },
  'task.status': {
    message: GeneralTaskStatusMessageRuntype,
    alternatives: TaskStatusMessageAlternativesRuntype,
  },
  'task.status.failed': { message: TaskFailedMessageRuntype },
  'task.mode': { message: TaskModeMessageRuntype },
  'task.mode.changed': { message: TaskModeMessageRuntype },
  'user.user': { message: UserMessageRuntype },
  'file.status.deletion': { message: FileDeletionMessageRuntype },
  'file.status.visibility.state': {
    message: FileVisibilityStateMessageRuntype,
  },
  'file.result.visibility.state': {
    message: VisibilityStateResultMessageRuntype,
  },
};

type TaskTypeToScheduledMessageKeyMapType = {
  [K in TaskTypes]: keyof typeof MessagesValidationMap;
};
export const TaskTypeToScheduledMessageKeyMap: TaskTypeToScheduledMessageKeyMapType =
  {
    DATA_FETCH: 'task.scheduled.data_fetch',
    DATA_UPLOAD: 'task.scheduled.data_upload',
    OBJECT_SYNC: 'task.scheduled.object_sync',
  };

export type MessageMap = {
  [key in keyof typeof MessagesValidationMap]: Static<
    (typeof MessagesValidationMap)[key]['message']
  >;
} & {
  taskSchedulingMessage: Static<
    (typeof MessagesValidationMap)['task.scheduled']['alternatives']
  >;
  taskStatusMessage: Static<
    (typeof MessagesValidationMap)['task.status']['alternatives']
  >;
};
