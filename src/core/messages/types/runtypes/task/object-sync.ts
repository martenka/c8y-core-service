import {
  Literal,
  Partial,
  Record,
  Union,
  String,
  Array,
  Number,
  Static,
} from 'runtypes';
import { CustomAttributesRuntype, CustomAttributes } from '../common';
export const ObjectTypes = Union(Literal('SENSOR'), Literal('GROUP'));

export const BaseManagedObjectRuntype = Record({
  managedObjectId: String,
  managedObjectName: String,
  objectType: ObjectTypes,
}).And(
  Partial({
    type: String,
    owner: String,
    additionalFragments: CustomAttributesRuntype,
  }),
);

export const SensorObjectRuntype = BaseManagedObjectRuntype.And(
  Record({
    objectType: ObjectTypes.alternatives[0],
    valueFragmentType: String,
  }),
);

export const GroupObjectRuntype = BaseManagedObjectRuntype.And(
  Record({
    objectType: ObjectTypes.alternatives[1],
    objects: Array(BaseManagedObjectRuntype),
  }),
).And(
  Partial({
    description: String,
  }),
);

export const ManagedObjectRuntype = SensorObjectRuntype.Or(GroupObjectRuntype);

export const ObjectSyncTaskStatusPayloadRuntype = Record({
  objects: Array(ManagedObjectRuntype),
});

export const ObjectSyncTaskResultPayloadRuntype = Record({
  objectAmount: Number,
});

export type ObjectSyncTaskStatusPayload = Static<
  typeof ObjectSyncTaskStatusPayloadRuntype
>;
export type ObjectSyncTaskResultPayload = Static<
  typeof ObjectSyncTaskResultPayloadRuntype
>;
export type ManagedObject = Static<typeof ManagedObjectRuntype>;
export type BaseManagedObject = Static<typeof BaseManagedObjectRuntype>;
export type Sensor = Static<typeof SensorObjectRuntype>;
export type Group = Omit<
  Static<typeof GroupObjectRuntype>,
  'additionalFragments'
> & { additionalFragments?: CustomAttributes };
