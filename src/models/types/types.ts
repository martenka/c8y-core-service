export type CustomAttributes = { [key: string]: string | CustomAttributes };

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
