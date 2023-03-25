import { HydratedDocument } from 'mongoose';
import { Properties } from '../types/types';
import { PagingQuery } from './pagination.dto';
import { PageInfo } from './page-info.dto';

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

export type PagingOptionsType = Properties<PagingQuery>;
export type PageInfoType = Properties<PageInfo>;
