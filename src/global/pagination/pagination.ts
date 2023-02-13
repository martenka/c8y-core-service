import { DBPagingResult, IPageInfo, IPagingOptions } from './types';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { notNil } from '../../utils/validation';
import { HydratedDocument } from 'mongoose';

@Exclude()
export class PageInfo implements IPageInfo {
  @Expose()
  pageSize: number;

  @Expose()
  currentPage?: number;

  @Expose()
  totalElements?: number;

  @Expose()
  totalPages?: number;
}

export class BaseDBPagination<T> implements DBPagingResult<T> {
  constructor(input?: DBPagingResult<T>) {
    if (notNil(input)) {
      this.data = input.data;
      this.pageInfo = input.pageInfo;
    }
  }

  data: HydratedDocument<T>[] | T[];

  @Expose()
  @Type(() => PageInfo)
  @ValidateNested()
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
  @Transform(({ value }) => parseInt(value))
  @IsBoolean()
  withTotalElements?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      switch (value.toLowerCase()) {
        case 'true':
          return true;
        case 'false':
          return false;
      }
    }
    return value;
  })
  @IsBoolean()
  withTotalPages?: boolean;
}
