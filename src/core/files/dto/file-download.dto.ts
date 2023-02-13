import {
  IsArray,
  IsDate,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const DownloadInputValues = ['GROUP', 'SENSOR'] as const;

export type DownloadInputType = (typeof DownloadInputValues)[number];

export class FileDownloadEntityDto {
  @IsNotEmpty()
  @IsMongoId({ message: 'Invalid ID provided!' })
  id: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}

export class FileDownloadDto {
  @IsNotEmpty()
  @IsIn(DownloadInputValues)
  type: DownloadInputType;

  @IsOptional()
  @IsString()
  taskName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileDownloadEntityDto)
  entities: FileDownloadEntityDto[];

  @Type(() => Date)
  @IsDate()
  dateFrom: Date;

  @Type(() => Date)
  @IsDate()
  dateTo: Date;
}
