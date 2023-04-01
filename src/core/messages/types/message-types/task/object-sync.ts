import { CustomAttributes } from '../../../../../models';

export enum ObjectTypes {
  SENSOR = 'SENSOR',
  GROUP = 'GROUP',
}
export interface ManagedObject {
  managedObjectId: string;
  managedObjectName: string;
  objectType: keyof typeof ObjectTypes;
  type?: string;
  owner?: string;
  additionalFragments?: CustomAttributes;
}

export interface Sensor extends ManagedObject {
  valueFragmentType?: string;
}

export interface Group extends ManagedObject {
  description?: string;
  objects: ManagedObject[];
}

export interface ObjectSyncTaskStatusPayload {
  objects: (Sensor | Group)[];
}

export interface ObjectSyncTaskResultPayload {
  objectAmount: number;
}
