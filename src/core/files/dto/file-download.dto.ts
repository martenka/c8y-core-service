import {
  IsDate,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

const DownloadInputValues = ['GROUP', 'SENSOR'] as const;

export type DownloadInputType = typeof DownloadInputValues[number];

export class FileDownloadDto {
  @IsNotEmpty()
  @IsIn(DownloadInputValues)
  type: DownloadInputType;

  @IsOptional()
  @IsString()
  taskName?: string;

  @IsOptional()
  @IsString({ each: true })
  fileNames?: string[];

  @IsNotEmpty()
  @IsMongoId({ each: true, message: 'Invalid ID provided!' })
  ids: string[];

  @Type(() => Date)
  @IsDate()
  dateFrom: Date;

  @Type(() => Date)
  @IsDate()
  dateTo: Date;
}
