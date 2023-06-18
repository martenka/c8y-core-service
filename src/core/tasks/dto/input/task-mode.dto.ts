import { TaskMode } from '../../../../models';
import { ArrayNotEmpty, IsEnum } from 'class-validator';
import { Types } from 'mongoose';
import { IsMongoIdInstance } from '../../../../decorators/custom-validators/mongo-id.validator';
import { TransformMongoId } from '../../../../decorators/transformers/object-id-transformer';

export class TaskModeDto {
  @IsEnum(TaskMode)
  type: TaskMode;

  @TransformMongoId()
  @IsMongoIdInstance({ each: true })
  @ArrayNotEmpty({ message: 'Provide at least one task' })
  taskIds: Types.ObjectId[];
}
