import {
  TaskPeriodicDataType,
  TaskSteps,
  TaskType,
  TaskTypes,
} from '../../../../../models';

export interface TaskScheduledMessage<P extends object = object>
  extends Pick<TaskType, 'taskType' | 'customAttributes'> {
  taskId: string;
  taskName: string;
  initiatedByUser: string;
  firstRunAt?: string;
  periodicData?: Pick<TaskPeriodicDataType, 'pattern' | 'fetchDurationSeconds'>;
  payload: P;
}

export interface TaskFailedMessagePayload {
  reason: string;
}

export interface TaskStatusMessage<
  P extends object = object,
  S extends TaskSteps = TaskSteps,
> {
  taskId: string;
  taskType: keyof typeof TaskTypes;
  status: S;
  payload: P;
}
