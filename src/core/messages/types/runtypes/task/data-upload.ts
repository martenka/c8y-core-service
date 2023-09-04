import {
  Array,
  Literal,
  Partial,
  Record,
  Static,
  String,
  Union,
} from 'runtypes';
import { CustomAttributesRuntype, ISOString } from '../common';

const DataUploadMessageStorage = Record({
  bucket: String,
  path: String,
});

const DataUploadMessageMetadata = Record({
  dateFrom: ISOString,
  dateTo: ISOString,
  managedObjectId: String,
  valueFragmentType: String,
  valueFragmentDescription: String,
}).And(
  Partial({
    managedObjectName: String,
    sensorDescription: String,
    fileDescription: String,
  }),
);

const DataUploadMessageFileRuntype = Record({
  fileName: String,
  storage: DataUploadMessageStorage,
  metadata: DataUploadMessageMetadata,
}).And(
  Partial({
    customAttributes: CustomAttributesRuntype,
  }),
);

export const PlatformIdentifiersRuntype = Union(Literal('CKAN'));

const DataUploadMessagePlatform = Record({
  platformIdentifier: PlatformIdentifiersRuntype,
});

export const DataUploadTaskMessagePayloadRuntype = Record({
  files: Array(DataUploadMessageFileRuntype),
  /**
   * Information about the platform where the files will be pushed
   */
  platform: DataUploadMessagePlatform,
});

export type DataUploadTaskMessagePayload = Static<
  typeof DataUploadTaskMessagePayloadRuntype
>;
export type AllowedPlatformIdentifiers = Static<
  typeof PlatformIdentifiersRuntype
>;
export type DataUploadMessageFile = Static<typeof DataUploadMessageFileRuntype>;
