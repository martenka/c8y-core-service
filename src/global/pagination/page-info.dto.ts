import { Exclude, Expose } from 'class-transformer';
import { IPageInfo } from './types';

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
