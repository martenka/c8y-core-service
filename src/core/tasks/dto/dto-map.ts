import { Task, TaskTypes } from '../../../models';
import { CreateDataFetchDto } from './input/create-datafetch-task.dto';
import { CreateObjectSyncDto } from './input/create-objectsync-task.dto';
import { Properties } from '../../../global/types/types';
import { HydratedDocument } from 'mongoose';
import { TaskTypesMap } from '../../../models';
import { CreateDataUploadTaskDto } from './input/create-dataupload-task.dto';

export const TaskCreationDtos: TaskTypesMap = {
  [TaskTypes.DATA_FETCH]: CreateDataFetchDto,
  [TaskTypes.OBJECT_SYNC]: CreateObjectSyncDto,
  [TaskTypes.DATA_UPLOAD]: CreateDataUploadTaskDto,
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
