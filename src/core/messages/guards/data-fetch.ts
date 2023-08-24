import { TaskStatusMessage } from '../types/message-types/task/types';
import { DataFetchTaskResult } from '../types/message-types/task/data-fetch';
import { isPresent } from '../../../utils/validation';
import { TaskSteps, TaskTypes } from '../../../models';

export function isDataFetchTaskResultMessage(
  message: TaskStatusMessage,
): message is DataFetchTaskResult {
  const isCorrectTaskStep =
    message.status === TaskSteps.DONE ||
    message.status === TaskSteps.WAITING_NEXT_CYCLE;
  return (
    isPresent(message) &&
    isCorrectTaskStep &&
    message.taskType === TaskTypes.DATA_FETCH &&
    'sensors' in message.payload
  );
}
