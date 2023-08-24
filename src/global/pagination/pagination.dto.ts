import { DBPagingResult, IPageInfo, IPagingOptions } from './types';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Expose, Transform, Type } from 'class-transformer';
import { isPresent } from '../../utils/validation';
import { HydratedDocument } from 'mongoose';
import { PageInfo } from './page-info.dto';
import { ApiProperty } from '@nestjs/swagger';
import { convertBooleanOrOriginal } from '../../utils/helpers';
import { TransformBoolean } from '../../decorators/transformers/boolean-transformer';

export class BaseDBPagination<T> implements DBPagingResult<T> {
  constructor(input?: DBPagingResult<T>) {
    if (isPresent(input)) {
      this.data = input.data;
      this.pageInfo = input.pageInfo;
    }
  }

  data: HydratedDocument<T>[] | T[];

  @Expose()
  @Type(() => PageInfo)
  @ValidateNested()
  @ApiProperty({ type: PageInfo })
  pageInfo: IPageInfo;

  toObject(): Omit<DBPagingResult<T>, 'data'> & { data: T[] } {
    let convertedData;
    if (
      this.data?.length >= 0 &&
      typeof this.data[0]?.['toObject'] === 'function'
    ) {
      convertedData = this.data.map((element) => element['toObject']());
    } else {
      convertedData = this.data;
    }
    return {
      data: convertedData,
      pageInfo: this.pageInfo,
    };
  }
}

export class PagingQuery implements IPagingOptions {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber(
    { allowInfinity: false, allowNaN: false },
    { message: 'pageSize must be a number!' },
  )
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(1)
  currentPage?: number;

  @IsOptional()
  @TransformBoolean()
  @IsBoolean()
  withTotalElements?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    return convertBooleanOrOriginal(value);
  })
  @IsBoolean()
  withTotalPages?: boolean;
}
