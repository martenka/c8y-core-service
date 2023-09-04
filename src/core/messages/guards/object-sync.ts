import { MessageMap } from '../types/runtypes/map';
import {
  Group,
  ManagedObject,
  Sensor,
} from '../types/runtypes/task/object-sync';

export function isObjectSyncTaskStatusMessage(
  message: MessageMap['task.status'],
): message is MessageMap['task.status.object_sync'] {
  return message.status === 'PROCESSING' && message.taskType === 'OBJECT_SYNC';
}

export function isObjectSyncTaskResultMessage(
  message: MessageMap['task.status'],
): message is MessageMap['task.status.object_sync.result'] {
  return (
    message.status === 'DONE' &&
    message.taskType === 'OBJECT_SYNC' &&
    ('objectAmount' as keyof MessageMap['task.status.object_sync.result']['payload']) in
      message.payload
  );
}

export function isSensor(value: ManagedObject): value is Sensor {
  return value.objectType === 'SENSOR';
}

export function isGroup(value: ManagedObject): value is Group {
  return value.objectType === 'GROUP';
}
