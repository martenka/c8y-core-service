import { TaskStatusMessage } from '../types/message-types/task/types';
import { DataFetchTaskResult } from '../types/message-types/task/data-fetch';
import { notNil } from '../../../utils/validation';
import { TaskSteps, TaskTypes } from '../../../models';

export function isDataFetchTaskResultMessage(
  message: TaskStatusMessage,
): message is DataFetchTaskResult {
  return (
    notNil(message) &&
    message.status === TaskSteps.DONE &&
    message.taskType === TaskTypes.DATA_FETCH &&
    'sensors' in message.payload
  );
}
