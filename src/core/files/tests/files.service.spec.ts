import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from '../files.service';
import { Connection, Types } from 'mongoose';
import {
  File,
  FileDocument,
  FileModel,
  FileSchema,
  Sensor,
  TaskSteps,
  VisibilityState,
} from '../../../models';

import { MessagesProducerService } from '../../messages/messages-producer.service';
import { SendMessageParams } from '../../messages/types/producer';
import { getModelToken } from '@nestjs/mongoose';
import { ApplicationConfigService } from '../../application-config/application-config.service';
import { SensorSearchOptions } from '../../../global/query/types';
import { SensorModel, SensorSchema, SensorType } from '../../../models/Sensor';
import { getSensorStub } from '../../../tests/stubs/sensor';
import { SensorsService } from '../../sensors/sensors.service';
import { SkipPagingService } from '../../paging/skip-paging.service';
import { ExchangeTypes } from '../../messages/types/exchanges';
import { FileLink, FileWithSensorProblem } from '../types/types';
import { Platform } from '../../../global/tokens';
import { getFileStub } from '../../../tests/stubs/file';
import { ForbiddenException } from '@nestjs/common';
import {
  setupTest,
  WithServiceSetupTestResult,
} from '../../../../test/setup/setup';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { DataFetchTaskResultSensor } from '../../messages/types/runtypes/task/data-fetch';

type FilesServiceExtension = WithServiceSetupTestResult<{
  models: {
    fileModel: FileModel;
    sensorModel: SensorModel;
  };
  services: {
    messagesProducerService: MessagesProducerService;
    configService: ApplicationConfigService;
    sensorsService: SensorsService;
    service: FilesService;
  };
}>;

describe('FilesService', () => {
  const urlDomain = 'http://localhost:1234';
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
      fileURL: `${urlDomain}/test_bucket/TestDataFetch1.csv`,
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
      url: `${urlDomain}/test_bucket/TestDataFetch1.csv`,
    },
    visibilityState: {
      published: false,
      exposedToPlatforms: [],
      stateChanging: false,
    },
  };

  function withTest(
    callback: (params: FilesServiceExtension) => Promise<void>,
  ): () => Promise<void> {
    async function setupFn(
      connection: Connection,
    ): Promise<FilesServiceExtension> {
      const mockApplicationConfigService = {
        get minioConfig() {
          return {
            url: urlDomain,
          };
        },
      } as ApplicationConfigService;

      const fileModel = connection.model(File.name, FileSchema);
      const sensorModel = connection.model(Sensor.name, SensorSchema);

      const mockSensorsService = {
        findOne: jest
          .fn()
          .mockImplementation((options: SensorSearchOptions): SensorType => {
            return getSensorStub({ _id: new Types.ObjectId(options.id) });
          }),
      };

      const messagesProducerService = new MessagesProducerService(
        null as unknown as AmqpConnection,
      );

      jest
        .spyOn(messagesProducerService, 'publishMessage')
        .mockImplementation((_args) => undefined);

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
          {
            provide: MessagesProducerService,
            useValue: messagesProducerService,
          },
          FilesService,
        ],
      }).compile();

      const service = module.get<FilesService>(FilesService);

      return {
        models: {
          fileModel,
          sensorModel,
        },
        services: {
          service,
          messagesProducerService,
          configService: mockApplicationConfigService,
          sensorsService: mockSensorsService as unknown as SensorsService,
        },
      };
    }

    return setupTest<FilesServiceExtension>(setupFn, callback);
  }

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it.concurrent(
    'creates files from message',
    withTest(async ({ services }) => {
      const files = await services.service.createFilesFromMessage({
        taskId: '6452b3a88dec40aa3fb072c1',
        taskType: 'DATA_FETCH',
        status: TaskSteps.DONE,
        payload: { sensors: [getDataFetchSensorStub()] },
      });

      expect(files).toHaveLength(1);
      const leanFiles = files.map((file) => file.toObject());
      expect(leanFiles).toEqual([expect.objectContaining(objectifiedFileStub)]);
    }),
  );

  it.concurrent(
    'removes files',
    withTest(async ({ models, services }) => {
      const sendMessageSpy = jest.spyOn(
        services.messagesProducerService,
        'sendMessage',
      );
      const idToDelete = new Types.ObjectId('6452bcca3192dd4c4ded6333');
      await models.fileModel.create([
        getFileStub({ _id: new Types.ObjectId('6452bceae11b1c3216239762') }),
        getFileStub({ _id: idToDelete }),
        getFileStub({ _id: new Types.ObjectId('6452bce21904e6e4046ff6c8') }),
      ]);
      await services.service.removeFile(idToDelete);

      const fileStub = getFileStub();
      await expect(models.fileModel.findById(idToDelete)).resolves.toEqual(
        null,
      );
      expect(sendMessageSpy).toHaveBeenCalledWith<SendMessageParams>(
        ExchangeTypes.GENERAL,
        'file.status.deletion',
        {
          files: [
            { bucket: fileStub.storage.bucket, path: fileStub.storage.path },
          ],
        },
      );
    }),
  );

  it.concurrent(
    'handles visibility change request',
    withTest(async ({ models, services }) => {
      const sendMessageSpy = jest.spyOn(
        services.messagesProducerService,
        'sendMessage',
      );
      const fileId = new Types.ObjectId('6452c1a13522331070faf106');
      await models.fileModel.create(getFileStub({ _id: fileId }));
      const updatedFile =
        await services.service.handleFileVisibilityChangeRequest(
          fileId,
          {
            newVisibilityState: VisibilityState.PUBLIC,
          },
          true,
        );
      expect(updatedFile.visibilityState.stateChanging).toEqual(true);
      const updatedFileFromDB = await models.fileModel.findById(fileId).exec();
      expect(updatedFileFromDB!.visibilityState.stateChanging).toEqual(true);
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
    }),
  );

  it.concurrent(
    'gets file link',
    withTest(async ({ models, services }) => {
      const file1Id = new Types.ObjectId('645395c0e78ded0d048b3304');
      const file2Id = new Types.ObjectId('645395cc551ed7c818712b8e');
      await models.fileModel.create([
        getFileStub({ _id: file1Id }),
        {
          ...getFileStub({ _id: file2Id }),
          storage: { bucket: 'bucket123', path: 'data/file5.csv' },
          name: 'file5.csv',
        },
      ]);

      const notExistingFileLink = await services.service.getFileLink(
        new Types.ObjectId('645396bbb3fb3db8824372db'),
        true,
      );
      expect(notExistingFileLink).toBeUndefined();
      const fileLink = await services.service.getFileLink(file2Id, true);
      expect(fileLink).toEqual<FileLink>({
        id: '645395cc551ed7c818712b8e',
        fileName: 'file5.csv',
        url: `${services.configService.minioConfig.url}/bucket123/data/file5.csv`,
      });
    }),
  );

  it.concurrent(
    `does not get file link without admin permissions`,
    withTest(async ({ models, services }) => {
      const file1Id = new Types.ObjectId('6457775c858be5d53da151ec');
      const file2Id = new Types.ObjectId('645777628a3b8550b0dd2967');
      await models.fileModel.create([
        getFileStub({ _id: file1Id }),
        {
          ...getFileStub({ _id: file2Id }),
          storage: { bucket: 'bucket123', path: 'data/file5.csv' },
          name: 'file5.csv',
        },
      ]);

      await expect(services.service.getFileLink(file2Id)).rejects.toThrowError(
        ForbiddenException,
      );
    }),
  );

  it.concurrent(
    'sets file exposed to platform information',
    withTest(async ({ models, services }) => {
      const fileId = new Types.ObjectId('645399cfbc6151fe31842867');
      await models.fileModel.create(getFileStub({ _id: fileId }));

      const updateResult = await services.service.setFileExposedToPlatform(
        [fileId],
        Platform.CKAN,
        true,
      );

      expect(updateResult.modifiedCount).toBe(1);
      const updatedFile = await models.fileModel.findById(fileId).exec();
      const leanUpdatedFile = updatedFile!.toObject();
      expect(leanUpdatedFile.visibilityState).toMatchObject({
        published: false,
        stateChanging: false,
        exposedToPlatforms: [Platform.CKAN],
      });
    }),
  );

  it.concurrent(
    'sets file visibility',
    withTest(async ({ models, services }) => {
      const fileId = new Types.ObjectId('64539e3b9bd0ddeeec486b8f');
      const createdFile = await models.fileModel.create({
        ...getFileStub({ _id: fileId }),
        storage: { bucket: 'private-bucket', path: 'file6.csv' },
      });

      expect(createdFile.storage.bucket).not.toEqual('public-bucket');
      await services.service.setFileVisibilityState({
        id: fileId,
        isSyncing: false,
        visibilityState: VisibilityState.PUBLIC,
        storage: {
          bucket: 'public-bucket',
          path: 'file6.csv',
        },
      });

      const updatedFile = await models.fileModel.findById(fileId).exec();
      const leanUpdatedFile = updatedFile!.toObject();
      expect(leanUpdatedFile.visibilityState).toMatchObject({
        published: true,
        stateChanging: false,
      });
      expect(leanUpdatedFile.storage).toMatchObject({
        bucket: 'public-bucket',
        path: 'file6.csv',
      });
    }),
  );

  it.concurrent(
    'find files unsuitable for upload to external system',
    withTest(async ({ models, services }) => {
      const inCompleteSensorId = new Types.ObjectId('6453a44bd8f6af0510c5adc7');
      await models.sensorModel.create([
        getSensorStub(),
        getSensorStub({
          _id: inCompleteSensorId,
          valueFragmentDisplayName: undefined,
        }),
      ]);
      const file1Id = new Types.ObjectId('6453a199c932db32c97a8753');
      const file2Id = new Types.ObjectId('6453a19e283f1a87fbf60a86');
      await models.fileModel.create([
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

      const unSuitableFiles =
        await services.service.getFilesUnsuitableForUpload([file1Id, file2Id]);

      expect(unSuitableFiles).toEqual([
        expect.objectContaining<FileWithSensorProblem>({
          fileId: file2Id.toString(),
          sensor: {
            sensorId: '6453a44bd8f6af0510c5adc7',
            problem: expect.any(String),
          },
        }),
      ]);
    }),
  );

  it.concurrent(
    'finds temperature files from timeframe',
    withTest(async ({ models, services }) => {
      const sensorId = new Types.ObjectId('6452a6971306581241dddd61');

      const file1Id = new Types.ObjectId('6453b381ad26dd6095a292a2');
      const file2Id = new Types.ObjectId('6453b3885add0a725128f80e');
      const file3Id = new Types.ObjectId('6453b38d78a78fa7b9abdf48');
      const file4Id = new Types.ObjectId('6453b3946bb0292e54e1398d');

      await models.fileModel.create([
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

      const pagedFoundFiles = await services.service.findMany(
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
    }),
  );

  it.concurrent(
    'non admin users finds only published files',
    withTest(async ({ models, services }) => {
      const sensorId = new Types.ObjectId('6452a6971306581241dddd61');

      const file1Id = new Types.ObjectId('6454b7e8c726ce31e7e35adb');
      const file2Id = new Types.ObjectId('6454b8173fe10f2a1caa4533');
      const file3Id = new Types.ObjectId('6454b81a52647d0787d2e73d');
      const file4Id = new Types.ObjectId('6454b81eb55270a38bc54777');

      await models.fileModel.create([
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

      const pagedFoundFiles = await services.service.findMany(
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
    }),
  );
});
