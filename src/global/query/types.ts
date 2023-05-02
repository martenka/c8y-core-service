import { KeyValueProperties } from './key-value';
import { Types } from 'mongoose';

export interface BaseSearchOptions {
  id?: string;
}

export interface SensorSearchOptions extends BaseSearchOptions {
  managedObjectId?: string;
  managedObjectName?: string;
  valueFragmentType?: string;
  valueFragmentDisplayName?: string;
  customAttributes?: KeyValueProperties[];
}

export interface GroupSearchOptions extends BaseSearchOptions {
  name?: string;
  managedObjectId?: string;
  sensors?: string[];
}

export interface FileTaskSearchOptions extends BaseSearchOptions {
  status?: string;
  name?: string;
  type?: string;
}

export interface UserSearchOptions {
  id?: Types.ObjectId;
  username?: string;
}
