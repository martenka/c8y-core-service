import { Test, TestingModule } from '@nestjs/testing';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';
import { Connection, connection, Types } from 'mongoose';
import { Sensor, SensorModel, SensorSchema } from '../../models/Sensor';

import { omit } from '../../utils/helpers';
import { getModelToken } from '@nestjs/mongoose';
import { SkipPagingService } from '../paging/skip-paging.service';

const sensorId = '64256472920c8d7a4cfb1970';

const testSensorEntity: Sensor = {
  _id: new Types.ObjectId(sensorId),
  managedObjectId: '123',
  managedObjectName: "AA01'Wall'BB1",
  valueFragmentType: 'VFT',
  valueFragmentDisplayName: 'Temperature',
  type: 'TEST_TYPE',
  owner: 'TEST_OWNER',
  description: 'TEST_DESCRIPTION',
  customAttributes: {
    test: 'value',
  },
  createdAt: new Date('2023-04-26T18:27:13.461Z'),
  updatedAt: new Date('2023-04-26T18:27:13.461Z'),
};

const leanTestSensorEntity = {
  ...omit(testSensorEntity, '_id'),
  _id: sensorId,
};

const testCreateSensorDto = omit(testSensorEntity, '_id');
describe('SensorsController', () => {
  let controller: SensorsController;
  const mongoConnection: Connection = connection;
  const sensorModel: SensorModel = mongoConnection.model(
    Sensor.name,
    SensorSchema,
  );

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SensorsController],
      providers: [
        { provide: getModelToken(Sensor.name), useValue: sensorModel },
        { provide: SkipPagingService, useValue: new SkipPagingService() },
        SensorsService,
      ],
    }).compile();

    controller = module.get<SensorsController>(SensorsController);
  });

  afterEach(async () => {
    const collections = mongoConnection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  it('finds existing sensor', async () => {
    await sensorModel.create(testSensorEntity);
    const sensor = (await controller.findOne(sensorId)).toObject();
    expect(sensor).toMatchObject(leanTestSensorEntity);
  });

  it('returns new created sensor', async () => {
    const createResponse = await controller.createSensor([testCreateSensorDto]);
    expect(Array.isArray(createResponse)).toBe(true);
    expect(createResponse).toHaveLength(1);
    const leanResponse = createResponse.map((sensor) => sensor.toObject());

    expect(leanResponse).toEqual([
      expect.objectContaining(
        omit(testCreateSensorDto, 'createdAt', 'updatedAt'),
      ),
    ]);
  });
});
