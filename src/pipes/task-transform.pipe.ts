import {
  BadRequestException,
  Injectable,
  PipeTransform,
  ValidationPipe,
} from '@nestjs/common';
import { CreateTaskDto } from '../core/tasks/dto/create-task';
import { Properties, TaskTypes } from '../models';
import { plainToInstance } from 'class-transformer';
import { CreateDataFetchDto } from '../core/tasks/dto/create-datafetch-task.dto';
import { CreateObjectSyncDto } from '../core/tasks/dto/create-objectsync-task';
import { isNil, isString } from '@nestjs/common/utils/shared.utils';
import { validate } from 'class-validator';

const TaskTypesMap = {
  [TaskTypes.DATA_FETCH]: CreateDataFetchDto,
  [TaskTypes.OBJECT_SYNC]: CreateObjectSyncDto,
};

@Injectable()
export class TaskTransformPipe
  implements PipeTransform<Properties<CreateTaskDto>>
{
  async transform(value: Properties<CreateTaskDto>): Promise<object> {
    const taskTypeKey = value?.taskType;
    const taskTypeDto = TaskTypesMap[taskTypeKey];

    if (
      isNil(taskTypeKey) ||
      isNil(taskTypeDto) ||
      !isString(taskTypeKey) ||
      !Object.values(TaskTypes).includes(taskTypeKey)
    ) {
      throw new BadRequestException('Unknown task type provided!');
    }

    const transformedDto = plainToInstance(taskTypeDto, value);
    const validation = await validate(transformedDto);

    if (validation.length > 0) {
      const validationPipe = new ValidationPipe();
      const exceptionFactory = validationPipe.createExceptionFactory();
      throw exceptionFactory(validation);
    }

    return transformedDto;
  }
}
