import { TaskTypes } from '../../../models';
import { CreateDataFetchDto } from './create-datafetch-task.dto';
import { CreateObjectSyncDto } from './create-objectsync-task';
import { Properties } from '../../../global/types/types';

export const TaskCreationDtos = {
  [TaskTypes.DATA_FETCH]: CreateDataFetchDto,
  [TaskTypes.OBJECT_SYNC]: CreateObjectSyncDto,
};

export type TaskCreationDtosType = Properties<typeof TaskCreationDtos>;
