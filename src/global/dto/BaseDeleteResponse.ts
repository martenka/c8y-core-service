import { Expose } from 'class-transformer';
import { IDeleteResponse } from './types';

export class BaseDeleteResponse implements IDeleteResponse {
  @Expose()
  deletedCount: number;
}
