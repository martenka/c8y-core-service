import {
  ObjectSyncTaskResultMessage,
  ObjectSyncTaskStatusMessage,
} from '../types/message-types/messageTypes';
import { TaskStatusMessage } from '../types/message-types/task/types';
import { TaskSteps, TaskTypes } from '../../../models';
import {
  Group,
  ManagedObject,
  ObjectTypes,
  Sensor,
} from '../types/message-types/task/object-sync';

export function isObjectSyncTaskStatusMessage(
  message: TaskStatusMessage,
): message is ObjectSyncTaskStatusMessage {
  return (
    message.status === TaskSteps.PROCESSING &&
    message.taskType === TaskTypes.OBJECT_SYNC &&
    Array.isArray(message?.payload['objects'])
  );
}

export function isObjectSyncTaskResultMessage(
  message: TaskStatusMessage,
): message is ObjectSyncTaskResultMessage {
  return (
    message.status === TaskSteps.DONE &&
    message.taskType === TaskTypes.OBJECT_SYNC &&
    typeof message?.payload['objectAmount'] === 'number'
  );
}

export function isSensor(value: ManagedObject): value is Sensor {
  return value.objectType === ObjectTypes.SENSOR;
}

export function isGroup(value: ManagedObject): value is Group {
  return value.objectType === ObjectTypes.GROUP;
}
