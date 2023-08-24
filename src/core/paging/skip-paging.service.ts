import { SkipPagingOptions } from './types/types';
import { Injectable } from '@nestjs/common';
import { ensureArray, isPresent } from '../../utils/validation';
import { DBPagingResult } from '../../global/pagination/types';
import { BaseDBPagination } from '../../global/pagination/pagination.dto';
import { Query } from 'mongoose';

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
      .populate(ensureArray(populate).filter(isPresent))
      .sort(sort as Parameters<Query<unknown, T>['sort']>[0]);

    const currentPage = isPresent(pagingOptions.currentPage)
      ? pagingOptions.currentPage - 1
      : 0;
    const pageSize = pagingOptions.pageSize ?? 10;

    const skip = currentPage * pageSize;
    let totalElements: number | undefined = undefined;
    let totalPages: number | undefined = undefined;

    if (pagingOptions.withTotalElements || pagingOptions.withTotalPages) {
      totalElements = await query.clone().count().exec();
      totalPages = Math.ceil(totalElements / pageSize);
    }

    const result = ensureArray(await query.skip(skip).limit(pageSize).exec());

    const pageInfo = {
      pageSize,
      currentPage: currentPage + 1,
      totalElements: isPresent(totalElements) ? totalElements : undefined,
      totalPages: isPresent(totalPages) ? totalPages : undefined,
    };

    const dbPagination = new BaseDBPagination<T>();
    dbPagination.pageInfo = pageInfo;
    dbPagination.data = result;

    return dbPagination;
  }
}
