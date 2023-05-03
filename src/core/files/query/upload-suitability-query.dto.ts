import { Types } from 'mongoose';
import { TransformMongoId } from '../../../decorators/transformers/object-id-transformer';
import { IsMongoIdInstance } from '../../../decorators/custom-validators/mongo-id.validator';

export class FileUploadSuitabilityQueryDto {
  @TransformMongoId(',')
  @IsMongoIdInstance({ each: true })
  fileIds: Types.ObjectId[];
}
