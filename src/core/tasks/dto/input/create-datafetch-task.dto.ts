import {
  IsArray,
  IsDate,
  IsDefined,
  IsIn,
  isMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Types } from 'mongoose';

import { CreateTaskDto } from './create-task';
import { IsMongoIdInstance } from '../../../../decorators/custom-validators/mongo-id.validator';

const DownloadInputValues = ['GROUP', 'SENSOR'] as const;

export type DownloadInputType = (typeof DownloadInputValues)[number];

export class DataFetchEntityDto {
  @IsMongoIdInstance({ message: 'Invalid id value provided!' })
  @Transform(({ value }) => {
    if (isMongoId(value)) {
      return new Types.ObjectId(value);
    }
    return value;
  })
  @IsNotEmpty()
  id: Types.ObjectId;

  @IsOptional()
  @IsString()
  fileName?: string;
}

export class DataFetchPayloadDto {
  @IsNotEmpty()
  @IsIn(DownloadInputValues)
  entityType: DownloadInputType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataFetchEntityDto)
  entities: DataFetchEntityDto[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;
}

export class CreateDataFetchDto extends CreateTaskDto {
  @IsDefined()
  @Type(() => DataFetchPayloadDto)
  @ValidateNested()
  taskPayload: DataFetchPayloadDto;
}
