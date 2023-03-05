import { Task, TaskTypes } from '../../../models';
import { CreateDataFetchDto } from './input/create-datafetch-task.dto';
import { CreateObjectSyncDto } from './input/create-objectsync-task';
import { Properties } from '../../../global/types/types';
import { HydratedDocument } from 'mongoose';

export const TaskCreationDtos = {
  [TaskTypes.DATA_FETCH]: CreateDataFetchDto,
  [TaskTypes.OBJECT_SYNC]: CreateObjectSyncDto,
};

export type TaskCreationDtosType = Properties<typeof TaskCreationDtos>;

export type TaskHandlersType<
  KeyType extends object,
  TaskType extends object,
  ReturnType extends Task = Task,
> = {
  [K in keyof KeyType]: (
    task: TaskType,
  ) => Promise<HydratedDocument<ReturnType>>;
};
