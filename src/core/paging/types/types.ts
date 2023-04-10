import {
  FilterQuery,
  Model,
  ProjectionType,
  QueryOptions,
  SortOrder,
} from 'mongoose';
import { IPagingOptions } from '../../../global/pagination/types';

export type Sort<T extends object> = {
  [key in keyof T]?: SortOrder | undefined | null;
};

export interface SkipPagingOptions<T extends object> {
  model: Model<T>;
  filter: FilterQuery<T>;
  sort: Sort<T>;
  pagingOptions: IPagingOptions;
  queryOptions?: QueryOptions<T>;
  projection?: ProjectionType<T>;
  populate?: string | string[];
}
