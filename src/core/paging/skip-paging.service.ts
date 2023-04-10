import { SkipPagingOptions } from './types/types';
import { Injectable } from '@nestjs/common';
import { ensureArray, notNil } from '../../utils/validation';
import { DBPagingResult } from '../../global/pagination/types';
import { BaseDBPagination } from '../../global/pagination/pagination.dto';

@Injectable()
export class SkipPagingService {
  /**
   * Queries data from given database model using skip/limit paging
   */
  async findWithPagination<T extends object>({
    model,
    sort,
    pagingOptions,
    queryOptions,
    projection,
    filter,
    populate,
  }: SkipPagingOptions<T>): Promise<DBPagingResult<T>> {
    const query = model
      .find(filter, projection, queryOptions)
      .populate(ensureArray(populate))
      .sort(sort);

    const currentPage = notNil(pagingOptions.currentPage)
      ? pagingOptions.currentPage - 1
      : 0;
    const pageSize = pagingOptions.pageSize ?? 10;

    const skip = currentPage * pageSize;
    let totalElements: number;
    let totalPages: number;

    if (pagingOptions.withTotalElements || pagingOptions.withTotalPages) {
      totalElements = await query.clone().count().exec();
      totalPages = Math.ceil(totalElements / pageSize);
    }

    const result = ensureArray(await query.skip(skip).limit(pageSize).exec());

    const pageInfo = {
      pageSize,
      currentPage: currentPage + 1,
      totalElements: notNil(pagingOptions.withTotalElements)
        ? totalElements
        : undefined,
      totalPages: notNil(pagingOptions.withTotalPages) ? totalPages : undefined,
    };

    const dbPagination = new BaseDBPagination<T>();
    dbPagination.pageInfo = pageInfo;
    dbPagination.data = result;

    return dbPagination;
  }
}
