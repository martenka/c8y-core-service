import { isPresent } from '../../../utils/validation';
import { MessageMap } from '../types/runtypes/map';

export function isDataFetchTaskResultMessage(
  message: MessageMap['task.status.data_fetch.result'],
): message is MessageMap['task.status.data_fetch.result'] {
  const isCorrectTaskStep = message.status === 'DONE';
  return (
    isPresent(message) && isCorrectTaskStep && message.taskType === 'DATA_FETCH'
  );
}
