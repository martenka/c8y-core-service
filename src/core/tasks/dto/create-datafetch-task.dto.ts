import {
  IsArray,
  IsDate,
  IsDefined,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTaskDto } from './create-task';

const DownloadInputValues = ['GROUP', 'SENSOR'] as const;

export type DownloadInputType = (typeof DownloadInputValues)[number];

export class DataFetchEntityDto {
  @IsNotEmpty()
  @IsMongoId({ message: 'Invalid ID provided!' })
  id: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}

export class DataFetchPayloadDto {
  @IsNotEmpty()
  @IsIn(DownloadInputValues)
  entityType: DownloadInputType;

  @IsOptional()
  @IsString()
  taskName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataFetchEntityDto)
  entities: DataFetchEntityDto[];

  @Type(() => Date)
  @IsDate()
  dateFrom: Date;

  @Type(() => Date)
  @IsDate()
  dateTo: Date;
}

export class CreateDataFetchDto extends CreateTaskDto {
  @IsDefined()
  @Type(() => DataFetchPayloadDto)
  @ValidateNested()
  taskPayload: DataFetchPayloadDto;
}
