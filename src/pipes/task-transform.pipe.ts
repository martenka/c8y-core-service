import {
  BadRequestException,
  Injectable,
  PipeTransform,
  ValidationPipe,
} from '@nestjs/common';
import { Task } from '../models';
import { plainToInstance } from 'class-transformer';
import { isString } from '@nestjs/common/utils/shared.utils';
import { validate } from 'class-validator';
import { TaskTypesMap } from '../models';
import { notPresent } from '../utils/validation';

@Injectable()
export class TaskTransformPipe
  implements PipeTransform<Pick<Task, 'taskType'>>
{
  constructor(private readonly dtoMap: TaskTypesMap) {}
  async transform(value: Pick<Task, 'taskType'>): Promise<object> {
    const taskTypeKey = value?.taskType;
    const taskDto = this.dtoMap[taskTypeKey];

    if (
      notPresent(taskTypeKey) ||
      !isString(taskTypeKey) ||
      notPresent(taskDto)
    ) {
      throw new BadRequestException('Unknown task type provided!');
    }

    const transformedDto = plainToInstance(taskDto, value);

    const validation = await validate(transformedDto, { whitelist: true });

    if (validation.length > 0) {
      const validationPipe = new ValidationPipe();
      const exceptionFactory = validationPipe.createExceptionFactory();
      throw exceptionFactory(validation);
    }

    return transformedDto;
  }
}
