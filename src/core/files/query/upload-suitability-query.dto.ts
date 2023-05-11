import { Types } from 'mongoose';
import { TransformMongoId } from '../../../decorators/transformers/object-id-transformer';
import { IsMongoIdInstance } from '../../../decorators/custom-validators/mongo-id.validator';
import { ApiProperty } from '@nestjs/swagger';

export class FileUploadSuitabilityQueryDto {
  @TransformMongoId(',')
  @IsMongoIdInstance({ each: true })
  @ApiProperty({
    type: 'string',
    isArray: true,
    description: 'File ids to check',
  })
  fileIds: Types.ObjectId[];
}
