export interface BaseSearchOptions {
  id?: string;
}

export interface SensorSearchOptions extends BaseSearchOptions {
  managedObjectId?: string;
  managedObjectName?: string;
  valueFragmentType?: string;
  valueFragmentDisplayName?: string;
}

export interface GroupSearchOptions extends BaseSearchOptions {
  name?: string;
  sensors?: string[];
}

export interface FileTaskSearchOptions extends BaseSearchOptions {
  status?: string;
  name?: string;
  type?: string;
}

export interface UserSearchOptions extends BaseSearchOptions {
  username?: string;
}
