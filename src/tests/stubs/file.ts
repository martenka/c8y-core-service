import { File } from '../../models';
import { Types } from 'mongoose';

interface FileStubSpecificOverrides {
  metadata?: Partial<File['metadata']>;
  storage?: Partial<File['storage']>;
  visibilityState?: Partial<File['visibilityState']>;
}

export function getFileStub(
  override: Partial<File> = {},
  options: FileStubSpecificOverrides = {},
): File {
  return {
    _id: new Types.ObjectId('6452b24bcb044a0a9ef2f9d4'),
    createdByTask: new Types.ObjectId('6452b3a88dec40aa3fb072c1'),
    customAttributes: {},
    description: '',
    metadata: {
      sensors: [new Types.ObjectId('6452a6971306581241dddd61')],
      dateFrom: new Date('2023-01-03T12:00:00.000Z'),
      dateTo: new Date('2023-01-06T12:00:00.000Z'),
      managedObjectName: "AA'BB'C1",
      managedObjectId: '100',
      valueFragments: [{ type: 'C8y_Temperature', description: 'Temperature' }],
      ...options.metadata,
    },
    name: 'TestDataFetch1.csv',
    storage: {
      bucket: 'test_bucket',
      path: 'TestDataFetch1.csv',
      ...options.storage,
    },
    url: `http://localhost:1234/test_bucket/TestDataFetch1.csv`,
    visibilityState: {
      published: false,
      exposedToPlatforms: [],
      stateChanging: false,
      ...options.visibilityState,
    },
    ...override,
  };
}
