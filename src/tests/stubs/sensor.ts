import { Sensor } from '../../models';
import { Types } from 'mongoose';
import { CreateSensorDto } from '../../core/sensors/dto/create-sensor.dto';

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

export function getCreateSensorDtoStub(
  override?: Partial<CreateSensorDto>,
): CreateSensorDto {
  return {
    managedObjectId: '980',
    managedObjectName: "AC01'Wall'BB5",
    valueFragmentType: 'TMP',
    valueFragmentDisplayName: 'Temperature',
    type: 'TEST_TYPE',
    owner: 'TEST_OWNER',
    description: 'TEST_DESCRIPTION',
    customAttributes: {
      test: 'value',
    },
    ...override,
  };
}
