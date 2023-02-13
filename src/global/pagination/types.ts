import { HydratedDocument } from 'mongoose';

export interface IPageInfo {
  pageSize: number;
  currentPage?: number;
  totalElements?: number;
  totalPages?: number;
}

export interface DBPagingResult<T> {
  data: HydratedDocument<T>[] | T[];
  pageInfo: IPageInfo;
}

export interface IPagingOptions {
  pageSize?: number;
  currentPage?: number;
  withTotalElements?: boolean;
  withTotalPages?: boolean;
}
