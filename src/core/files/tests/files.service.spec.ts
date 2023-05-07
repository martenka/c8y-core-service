import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from '../files.service';
import { connection, Types } from 'mongoose';
import {
  File,
  FileDocument,
  FileSchema,
  Sensor,
  TaskSteps,
  VisibilityState,
} from '../../../models';
import { clearCollections } from '../../../utils/tests';
import { MessagesProducerService } from '../../messages/messages-producer.service';
import { SendMessageParams } from '../../messages/types/producer';
import { getModelToken } from '@nestjs/mongoose';
import { ApplicationConfigService } from '../../application-config/application-config.service';
import { DataFetchTaskResultSensor } from '../../messages/types/message-types/task/data-fetch';
import { SensorSearchOptions } from '../../../global/query/types';
import { SensorSchema, SensorType } from '../../../models/Sensor';
import { getSensorStub } from '../../../tests/stubs/sensor';
import { SensorsService } from '../../sensors/sensors.service';
import { SkipPagingService } from '../../paging/skip-paging.service';
import { ExchangeTypes } from '../../messages/types/exchanges';
import { FileLink, FileWithSensorProblem } from '../types/types';
import { Platform } from '../../../global/tokens';
import { getFileStub } from '../../../tests/stubs/file';
import { ForbiddenException } from '@nestjs/common';

describe('FilesService', () => {
  let service: FilesService;
  const mockApplicationConfigService = {
    get minioConfig() {
      return {
        url: 'http://localhost:1234',
      };
    },
  };
  function getDataFetchSensorStub(
    valueOverride: Partial<DataFetchTaskResultSensor> = {},
  ): DataFetchTaskResultSensor {
    return {
      bucket: 'test_bucket',
      dateFrom: '2023-01-03T12:00:00.000Z',
      dateTo: '2023-01-06T12:00:00.000Z',
      sensorId: '6452a6971306581241dddd61',
      fileName: 'TestDataFetch1.csv',
      filePath: 'TestDataFetch1.csv',
      fileURL: `${mockApplicationConfigService.minioConfig.url}/test_bucket/TestDataFetch1.csv`,
      isPublicBucket: false,
      ...valueOverride,
    };
  }

  const objectifiedFileStub = {
    createdByTask: '6452b3a88dec40aa3fb072c1',
    metadata: {
      sensors: ['6452a6971306581241dddd61'],
      dateFrom: new Date('2023-01-03T12:00:00.000Z'),
      dateTo: new Date('2023-01-06T12:00:00.000Z'),
      managedObjectName: "AA'BB'C1",
      managedObjectId: '100',
      valueFragments: [{ type: 'C8y_Temperature', description: 'Temperature' }],
    },
    name: 'TestDataFetch1.csv',
    storage: {
      bucket: 'test_bucket',
      path: 'TestDataFetch1.csv',
      url: `${mockApplicationConfigService.minioConfig.url}/test_bucket/TestDataFetch1.csv`,
    },
    visibilityState: {
      published: false,
      exposedToPlatforms: [],
      stateChanging: false,
    },
  };

  const fileModel = connection.model(File.name, FileSchema);
  const sensorModel = connection.model(Sensor.name, SensorSchema);

  const mockSensorsService = {
    findOne: jest
      .fn()
      .mockImplementation((options: SensorSearchOptions): SensorType => {
        return getSensorStub({ _id: new Types.ObjectId(options.id) });
      }),
  };

  const messageProducerService = new MessagesProducerService(null);
  let sendMessageSpy: jest.SpyInstance<void, SendMessageParams>;
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: getModelToken(File.name), useValue: fileModel },
        { provide: getModelToken(Sensor.name), useValue: sensorModel },
        { provide: SensorsService, useValue: mockSensorsService },
        { provide: SkipPagingService, useClass: SkipPagingService },
        {
          provide: ApplicationConfigService,
          useValue: mockApplicationConfigService,
        },
        { provide: MessagesProducerService, useValue: messageProducerService },
        FilesService,
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  beforeEach(() => {
    sendMessageSpy = jest
      .spyOn(messageProducerService, 'sendMessage')
      .mockImplementation((_args) => undefined);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await clearCollections(connection);
  });

  it('creates files from message', async () => {
    const files = await service.createFilesFromMessage({
      taskId: '6452b3a88dec40aa3fb072c1',
      taskType: 'DATA_FETCH',
      status: TaskSteps.DONE,
      payload: { sensors: [getDataFetchSensorStub()] },
    });

    expect(files).toHaveLength(1);
    const leanFiles = files.map((file) => file.toObject());
    expect(leanFiles).toEqual([expect.objectContaining(objectifiedFileStub)]);
  });

  it('removes files', async () => {
    const idToDelete = new Types.ObjectId('6452bcca3192dd4c4ded6333');
    await fileModel.create([
      getFileStub({ _id: new Types.ObjectId('6452bceae11b1c3216239762') }),
      getFileStub({ _id: idToDelete }),
      getFileStub({ _id: new Types.ObjectId('6452bce21904e6e4046ff6c8') }),
    ]);
    await service.removeFile(idToDelete);

    const fileStub = getFileStub();
    await expect(fileModel.findById(idToDelete)).resolves.toEqual(null);
    expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
      ExchangeTypes.GENERAL,
      'file.status.deletion',
      {
        files: [
          { bucket: fileStub.storage.bucket, path: fileStub.storage.path },
        ],
      },
    );
  });

  it('handles visibility change request', async () => {
    const fileId = new Types.ObjectId('6452c1a13522331070faf106');
    await fileModel.create(getFileStub({ _id: fileId }));
    const updatedFile = await service.handleFileVisibilityChangeRequest(
      fileId,
      {
        newVisibilityState: VisibilityState.PUBLIC,
      },
      true,
    );
    expect(updatedFile.visibilityState.stateChanging).toEqual(true);
    const updatedFileFromDB = await fileModel.findById(fileId).exec();
    expect(updatedFileFromDB.visibilityState.stateChanging).toEqual(true);
    expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
      ExchangeTypes.GENERAL,
      'file.status.visibility.state',
      {
        newVisibilityState: VisibilityState.PUBLIC,
        fileId: '6452c1a13522331070faf106',
        filePath: 'TestDataFetch1.csv',
        bucket: 'test_bucket',
      },
    );
  });

  it('gets file link', async () => {
    const file1Id = new Types.ObjectId('645395c0e78ded0d048b3304');
    const file2Id = new Types.ObjectId('645395cc551ed7c818712b8e');
    await fileModel.create([
      getFileStub({ _id: file1Id }),
      {
        ...getFileStub({ _id: file2Id }),
        storage: { bucket: 'bucket123', path: 'data/file5.csv' },
        name: 'file5.csv',
      },
    ]);

    const notExistingFileLink = await service.getFileLink(
      new Types.ObjectId('645396bbb3fb3db8824372db'),
      true,
    );
    expect(notExistingFileLink).toBeUndefined();
    const fileLink = await service.getFileLink(file2Id, true);
    expect(fileLink).toEqual<FileLink>({
      id: '645395cc551ed7c818712b8e',
      fileName: 'file5.csv',
      url: `${mockApplicationConfigService.minioConfig.url}/bucket123/data/file5.csv`,
    });
  });

  it(`does not get file link without admin permissions`, async () => {
    const file1Id = new Types.ObjectId('6457775c858be5d53da151ec');
    const file2Id = new Types.ObjectId('645777628a3b8550b0dd2967');
    await fileModel.create([
      getFileStub({ _id: file1Id }),
      {
        ...getFileStub({ _id: file2Id }),
        storage: { bucket: 'bucket123', path: 'data/file5.csv' },
        name: 'file5.csv',
      },
    ]);

    await expect(service.getFileLink(file2Id)).rejects.toThrowError(
      ForbiddenException,
    );
  });

  it('sets file exposed to platform information', async () => {
    const fileId = new Types.ObjectId('645399cfbc6151fe31842867');
    await fileModel.create(getFileStub({ _id: fileId }));

    const updateResult = await service.setFileExposedToPlatform(
      [fileId],
      Platform.CKAN,
      true,
    );

    expect(updateResult.modifiedCount).toBe(1);
    const updatedFile = await fileModel.findById(fileId).exec();
    const leanUpdatedFile = updatedFile.toObject();
    expect(leanUpdatedFile.visibilityState).toMatchObject({
      published: false,
      stateChanging: false,
      exposedToPlatforms: [Platform.CKAN],
    });
  });

  it('sets file visibility', async () => {
    const fileId = new Types.ObjectId('64539e3b9bd0ddeeec486b8f');
    const createdFile = await fileModel.create({
      ...getFileStub({ _id: fileId }),
      storage: { bucket: 'private-bucket', path: 'file6.csv' },
    });

    expect(createdFile.storage.bucket).not.toEqual('public-bucket');
    await service.setFileVisibilityState({
      id: fileId,
      isSyncing: false,
      visibilityState: VisibilityState.PUBLIC,
      storage: {
        bucket: 'public-bucket',
        path: 'file6.csv',
      },
    });

    const updatedFile = await fileModel.findById(fileId).exec();
    const leanUpdatedFile = updatedFile.toObject();
    expect(leanUpdatedFile.visibilityState).toMatchObject({
      published: true,
      stateChanging: false,
    });
    expect(leanUpdatedFile.storage).toMatchObject({
      bucket: 'public-bucket',
      path: 'file6.csv',
    });
  });

  it('find files unsuitable for upload to external system', async () => {
    const inCompleteSensorId = new Types.ObjectId('6453a44bd8f6af0510c5adc7');
    await sensorModel.create([
      getSensorStub(),
      getSensorStub({
        _id: inCompleteSensorId,
        valueFragmentDisplayName: undefined,
      }),
    ]);
    const file1Id = new Types.ObjectId('6453a199c932db32c97a8753');
    const file2Id = new Types.ObjectId('6453a19e283f1a87fbf60a86');
    await fileModel.create([
      getFileStub({ _id: file1Id }),
      {
        ...getFileStub({ _id: file2Id }),
        metadata: {
          sensors: [inCompleteSensorId],
          dateFrom: new Date('2023-01-03T12:00:00.000Z'),
          dateTo: new Date('2023-01-06T12:00:00.000Z'),
          managedObjectName: "AB'AB'A1",
          managedObjectId: '200',
          valueFragments: [{ type: 'C8y_Temperature' }],
        },
        storage: { bucket: 'bucket555', path: 'data/file11.csv' },
        name: 'file11.csv',
      },
    ]);

    const unSuitableFiles = await service.getFilesUnsuitableForUpload([
      file1Id,
      file2Id,
    ]);

    expect(unSuitableFiles).toEqual([
      expect.objectContaining<FileWithSensorProblem>({
        fileId: file2Id.toString(),
        sensor: {
          sensorId: '6453a44bd8f6af0510c5adc7',
          problem: expect.any(String),
        },
      }),
    ]);
  });

  it('finds temperature files from timeframe', async () => {
    const sensorId = new Types.ObjectId('6452a6971306581241dddd61');

    const file1Id = new Types.ObjectId('6453b381ad26dd6095a292a2');
    const file2Id = new Types.ObjectId('6453b3885add0a725128f80e');
    const file3Id = new Types.ObjectId('6453b38d78a78fa7b9abdf48');
    const file4Id = new Types.ObjectId('6453b3946bb0292e54e1398d');

    await fileModel.create([
      getFileStub({ _id: file1Id }),
      {
        ...getFileStub({ _id: file2Id }),
        metadata: {
          sensors: [sensorId],
          dateFrom: new Date('2023-01-05T12:00:00.000Z'),
          dateTo: new Date('2023-01-13T12:00:00.000Z'),
          managedObjectName: "AB'AB'A1",
          managedObjectId: '200',
          valueFragments: [{ type: 'C8y_Temperature' }],
        },
        storage: { bucket: 'test-bucket', path: 'file20.csv' },
        name: 'file20.csv',
      },
      {
        ...getFileStub({ _id: file3Id }),
        metadata: {
          sensors: [sensorId],
          dateFrom: new Date('2023-01-13T12:00:00.001Z'),
          dateTo: new Date('2023-01-20T12:00:00.000Z'),
          managedObjectName: "AB'AB'A1",
          managedObjectId: '200',
          valueFragments: [{ type: 'C8y_Temperature' }],
        },
        storage: { bucket: 'test-bucket', path: 'file21.csv' },
        name: 'file21.csv',
      },
      {
        ...getFileStub({ _id: file4Id }),
        metadata: {
          sensors: [sensorId],
          dateFrom: new Date('2023-01-07T12:00:00.001Z'),
          dateTo: new Date('2023-01-17T12:00:00.000Z'),
          managedObjectName: "EE'KK'A1",
          managedObjectId: '300',
          valueFragments: [{ type: 'C8y_Humidity' }],
        },
        storage: { bucket: 'test-bucket', path: 'file22.csv' },
        name: 'file22.csv',
      },
    ]);

    const pagedFoundFiles = await service.findMany(
      {
        valueFragmentType: 'C8y_Temperature',
        dateFrom: '2023-01-04T12:00:00.000Z',
        dateTo: '2023-01-20T12:00:00.000Z',
      },
      {},
      true,
    );
    expect(pagedFoundFiles.data).toHaveLength(2);
    const leanFiles = (pagedFoundFiles.data as FileDocument[]).map((file) =>
      file.toObject(),
    );
    expect(leanFiles).toEqual([
      expect.objectContaining({
        _id: '6453b38d78a78fa7b9abdf48',
        name: 'file21.csv',
        metadata: expect.objectContaining({
          dateFrom: new Date('2023-01-13T12:00:00.001Z'),
          dateTo: new Date('2023-01-20T12:00:00.000Z'),
          valueFragments: [{ type: 'C8y_Temperature' }],
        }),
      }),
      expect.objectContaining({
        _id: '6453b3885add0a725128f80e',
        name: 'file20.csv',
        metadata: expect.objectContaining({
          dateFrom: new Date('2023-01-05T12:00:00.000Z'),
          dateTo: new Date('2023-01-13T12:00:00.000Z'),
          valueFragments: [{ type: 'C8y_Temperature' }],
        }),
      }),
    ]);
  });

  it('non admin users finds only published files', async () => {
    const sensorId = new Types.ObjectId('6452a6971306581241dddd61');

    const file1Id = new Types.ObjectId('6454b7e8c726ce31e7e35adb');
    const file2Id = new Types.ObjectId('6454b8173fe10f2a1caa4533');
    const file3Id = new Types.ObjectId('6454b81a52647d0787d2e73d');
    const file4Id = new Types.ObjectId('6454b81eb55270a38bc54777');

    await fileModel.create([
      getFileStub({ _id: file1Id }),
      {
        ...getFileStub({ _id: file2Id }),
        metadata: {
          sensors: [sensorId],
          dateFrom: new Date('2023-01-05T12:00:00.000Z'),
          dateTo: new Date('2023-01-13T12:00:00.000Z'),
          managedObjectName: "AB'AB'A1",
          managedObjectId: '200',
          valueFragments: [{ type: 'C8y_Temperature' }],
        },
        visibilityState: {
          stateChanging: false,
          published: true,
          exposedToPlatforms: [],
        },
        storage: { bucket: 'test-bucket', path: 'file20.csv' },
        name: 'file20.csv',
      },
      {
        ...getFileStub({ _id: file3Id }),
        metadata: {
          sensors: [sensorId],
          dateFrom: new Date('2023-01-13T12:00:00.001Z'),
          dateTo: new Date('2023-01-20T12:00:00.000Z'),
          managedObjectName: "AB'AB'A1",
          managedObjectId: '200',
          valueFragments: [{ type: 'C8y_Temperature' }],
        },
        storage: { bucket: 'test-bucket', path: 'file21.csv' },
        name: 'file21.csv',
      },
      {
        ...getFileStub({ _id: file4Id }),
        metadata: {
          sensors: [sensorId],
          dateFrom: new Date('2023-01-07T12:00:00.001Z'),
          dateTo: new Date('2023-01-17T12:00:00.000Z'),
          managedObjectName: "EE'KK'A1",
          managedObjectId: '300',
          valueFragments: [{ type: 'C8y_Humidity' }],
        },
        storage: { bucket: 'test-bucket', path: 'file22.csv' },
        name: 'file22.csv',
      },
    ]);

    const pagedFoundFiles = await service.findMany(
      {
        valueFragmentType: 'C8y_Temperature',
        dateFrom: '2023-01-04T12:00:00.000Z',
        dateTo: '2023-01-20T12:00:00.000Z',
      },
      {},
      false,
    );
    expect(pagedFoundFiles.data).toHaveLength(1);
    const leanFiles = (pagedFoundFiles.data as FileDocument[]).map((file) =>
      file.toObject(),
    );
    expect(leanFiles).toEqual([
      expect.objectContaining({
        _id: '6454b8173fe10f2a1caa4533',
        name: 'file20.csv',
        metadata: expect.objectContaining({
          dateFrom: new Date('2023-01-05T12:00:00.000Z'),
          dateTo: new Date('2023-01-13T12:00:00.000Z'),
          valueFragments: [{ type: 'C8y_Temperature' }],
        }),
      }),
    ]);
  });
});
