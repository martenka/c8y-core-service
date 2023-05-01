import { Test, TestingModule } from '@nestjs/testing';
import { SensorsService } from '../sensors.service';
import { connection, Types } from 'mongoose';
import { Sensor, SensorModel, SensorSchema } from '../../../models/Sensor';
import { omit } from '../../../utils/helpers';
import { getModelToken } from '@nestjs/mongoose';
import { SkipPagingService } from '../../paging/skip-paging.service';
import { UpdateSensorDto } from '../dto/update-sensor.dto';

describe('SensorsService', () => {
  let service: SensorsService;
  const mongoConnection = connection;
  const sensorModel: SensorModel = mongoConnection.model(
    Sensor.name,
    SensorSchema,
  );

  const testSensorEntities: Sensor[] = [
    {
      _id: new Types.ObjectId('64256472920c8d7a4cfb1970'),
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
    },
    {
      _id: new Types.ObjectId('644a39b32c79bd2d6793694a'),
      managedObjectId: '456',
      managedObjectName: "BB'Floor",
      valueFragmentType: 'DP',
      valueFragmentDisplayName: 'Co2',
      type: 'TEST_TYPE',
      owner: 'TEST_OWNER',
      description: 'Some CO2 sensor',
      customAttributes: { test: 'value' },
      createdAt: new Date('2023-04-27T13:00:13.461Z'),
      updatedAt: new Date('2023-04-27T13:00:13.461Z'),
    },
  ];

  const firstSensorId = testSensorEntities[0]._id.toString();
  const secondSensorId = testSensorEntities[1]._id.toString();
  const leanTestSensorEntity = {
    ...omit(testSensorEntities[0], '_id'),
    _id: firstSensorId,
  };

  const testCreateSensorDto = omit(testSensorEntities[0], '_id');

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: getModelToken(Sensor.name), useValue: sensorModel },
        { provide: SkipPagingService, useValue: new SkipPagingService() },
        SensorsService,
      ],
    }).compile();

    service = module.get<SensorsService>(SensorsService);
  });

  afterEach(async () => {
    const collections = mongoConnection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  it('finds existing sensor', async () => {
    await sensorModel.create(testSensorEntities[0]);
    const sensor = (
      await service.findOne({ id: firstSensorId, managedObjectId: '123' })
    ).toObject();
    expect(sensor).toMatchObject(leanTestSensorEntity);
  });

  it('return undefined when no sensor is found', async () => {
    await sensorModel.create(testSensorEntities[0]);
    const sensor = await service.findOne({ id: '64256472920c8d7a4cfb1973' });
    expect(sensor).toBeUndefined();
  });

  it('returns new created sensor', async () => {
    const createResponse = await service.createSensors([testCreateSensorDto]);
    expect(Array.isArray(createResponse)).toBe(true);
    expect(createResponse).toHaveLength(1);
    const leanResponse = createResponse.map((sensor) => sensor.toObject());

    expect(leanResponse).toEqual([
      expect.objectContaining(
        omit(testCreateSensorDto, 'createdAt', 'updatedAt'),
      ),
    ]);
  });

  it('correctly removes sensor from db', async () => {
    await sensorModel.create(testSensorEntities[0]);
    await service.removeSensor(firstSensorId);
    const deletedSensor = await sensorModel.findById(firstSensorId);
    expect(deletedSensor).toBeNull();
  });

  it('correctly searches sensors', async () => {
    await sensorModel.create(testSensorEntities);
    const sensorFilterResponse = await service.findMany(
      {
        managedObjectId: '456',
      },
      {},
    );
    expect(sensorFilterResponse).toHaveProperty('data');
    expect(sensorFilterResponse).toHaveProperty('pageInfo');
    expect(Array.isArray(sensorFilterResponse?.data)).toBe(true);
    expect(sensorFilterResponse.data).toHaveLength(1);

    const leanSensors = sensorFilterResponse.data.map((sensor) =>
      sensor.toObject(),
    );

    expect(leanSensors).toEqual([
      expect.objectContaining({
        ...omit(testSensorEntities[1], '_id'),
        _id: secondSensorId,
      }),
    ]);
    expect(sensorFilterResponse?.pageInfo).toMatchObject({
      currentPage: 1,
    });
  });

  it('correctly updates one sensor', async () => {
    await sensorModel.create(testSensorEntities[0]);
    const sensorUpdate = {
      valueFragmentDisplayName: 'Temp',
      customAttributes: { another: 'value' },
    };

    const updatedSensors = await service.updateSensors([
      { ...sensorUpdate, id: firstSensorId },
    ]);

    expect(updatedSensors).toBeDefined();
    expect(updatedSensors).toHaveLength(1);
    const leanUpdatedSensor = updatedSensors[0].toObject();

    expect(leanUpdatedSensor).toMatchObject({
      ...omit(
        testSensorEntities[0],
        '_id',
        'valueFragmentDisplayName',
        'customAttributes',
      ),
      ...sensorUpdate,
      _id: firstSensorId,
    });
  });

  it('correctly updates many sensors', async () => {
    await sensorModel.create(testSensorEntities);
    const sensor1Update: UpdateSensorDto = {
      id: firstSensorId,
      valueFragmentDisplayName: 'ABCD',
      description: 'UpdatedDescription',
    };

    const sensor2Update: UpdateSensorDto = {
      id: secondSensorId,
      valueFragmentDisplayName: 'AAAA',
      valueFragmentType: 'Type2',
    };

    const updatedSensors = await service.updateSensors([
      sensor1Update,
      sensor2Update,
    ]);

    expect(updatedSensors).toBeDefined();
    expect(Array.isArray(updatedSensors)).toBe(true);

    const leanUpdatedSensors = updatedSensors.map((sensor) =>
      sensor.toObject(),
    );

    expect(leanUpdatedSensors).toEqual(
      expect.arrayContaining([
        expect.objectContaining(
          omit(
            {
              ...omit(
                testSensorEntities[0],
                '_id',
                'valueFragmentDisplayName',
                'description',
              ),
              ...sensor1Update,
              _id: firstSensorId,
            },
            'id',
          ),
        ),
        expect.objectContaining(
          omit(
            {
              ...omit(
                testSensorEntities[1],
                '_id',
                'valueFragmentDisplayName',
                'valueFragmentType',
              ),
              ...sensor2Update,
              _id: secondSensorId,
            },
            'id',
          ),
        ),
      ]),
    );
  });
});
