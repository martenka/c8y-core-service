import { Sensor } from '../../models';
import { Types } from 'mongoose';

export function getSensorStub(override: Partial<Sensor> = {}): Sensor {
  return {
    customAttributes: {
      room: '1000',
      floor: '2',
    },
    valueFragmentDisplayName: 'Temperature',
    _id: new Types.ObjectId('64287f48953f0180ac4811b5'),
    managedObjectId: '100',
    managedObjectName: "AA'BB'C1",
    valueFragmentType: 'C8y_Temperature',
    owner: 'test_owner',
    type: 'bacnet',
    createdAt: new Date('2023-04-01T19:00:24.540Z'),
    updatedAt: new Date('2023-04-01T19:00:24.540Z'),
    ...override,
  };
}
