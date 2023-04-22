import { CreateTaskDto } from './create-task.dto';
import { Properties } from '../../../../global/types/types';

export class CreateObjectSyncDto extends CreateTaskDto {}

export type CreateObjectSyncDtoProperties = Properties<CreateObjectSyncDto>;
