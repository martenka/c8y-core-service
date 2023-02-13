import { SortOrder } from 'mongoose';

export type Sort<T extends object> = {
  [key in keyof T]?: SortOrder | undefined | null;
};
