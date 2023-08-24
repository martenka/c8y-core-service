import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  File,
  FileDocument,
  FileMetadata,
  FileModel,
  FileProperties,
  FileStorageProperties,
  FileValueFragmentProperties,
  VisibilityState,
} from '../../models';
import { SensorsService } from '../sensors/sensors.service';
import { ensureArray, isPresent, notPresent } from '../../utils/validation';
import {
  idToObjectIDOrOriginal,
  idToObjectIDOrUndefined,
  removeNilProperties,
} from '../../utils/helpers';
import {
  DBPagingResult,
  PagingOptionsType,
} from '../../global/pagination/types';
import { SkipPagingService } from '../paging/skip-paging.service';
import { FilterQuery, Types, UpdateQuery } from 'mongoose';
import { FileQueryOptions } from './query/file-query.dto';
import {
  FileLink,
  FileSetVisibilityStateParams,
  FileWithSensorProblem,
} from './types/types';
import { ApplicationConfigService } from '../application-config/application-config.service';
import { DeleteInputProperties } from '../../global/dto/deletion';
import { IDeleteResponse } from '../../global/dto/types';
import { MessagesProducerService } from '../messages/messages-producer.service';
import { getDeletedIds } from '../../models/utils/utils';
import { VisibilityStateDtoProperties } from './dto/visibility-state.dto';
import { DataFetchTaskResult } from '../messages/types/message-types/task/data-fetch';
import { Platform } from '../../global/tokens';
import { SensorType } from '../../models/Sensor';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectModel(File.name) private readonly fileModel: FileModel,
    private readonly configService: ApplicationConfigService,
    private readonly sensorsService: SensorsService,
    private skipPagingService: SkipPagingService,
    private readonly messagesProducerService: MessagesProducerService,
  ) {}

  async createFilesFromMessage(
    message: DataFetchTaskResult,
  ): Promise<FileDocument[]> {
    const files: FileProperties[] = [];
    const taskId = idToObjectIDOrUndefined(message.taskId);
    for (const sensor of message.payload.sensors) {
      const existingSensor = await this.sensorsService.findOne({
        id: sensor.sensorId,
      });
      if (notPresent(sensor.filePath)) {
        this.logger.log('Skipping creating file as storage path is missing');
        continue;
      }
      const fileStorageInfo: FileStorageProperties = {
        bucket: sensor.bucket,
        url: this.getFileUrl(sensor.bucket, sensor.filePath),
        path: sensor.filePath,
      };

      const valueFragments: FileValueFragmentProperties[] = [];
      if (isPresent(existingSensor)) {
        valueFragments.push({
          type: existingSensor.valueFragmentType,
          description: existingSensor.valueFragmentDisplayName,
        });
      }

      const fileMetadata: FileMetadata = {
        managedObjectId: existingSensor?.managedObjectId.toString(),
        managedObjectName: existingSensor?.managedObjectName,
        valueFragments,
        sensors: isPresent(existingSensor) ? [existingSensor._id] : [],
        dateFrom: new Date(sensor.dateFrom),
        dateTo: new Date(sensor.dateTo),
      };

      files.push({
        name: sensor.fileName,
        createdByTask: taskId,
        customAttributes: {},
        storage: fileStorageInfo,
        metadata: fileMetadata,
        visibilityState: {
          published: sensor.isPublicBucket,
          stateChanging: false,
          exposedToPlatforms: [],
        },
      });
    }

    const createdFiles = await this.fileModel.insertMany(files);
    this.populateUrl(createdFiles);
    return createdFiles;
  }

  async findMany(
    searchOptions: FileQueryOptions,
    pagingOptions: PagingOptionsType,
    isAdmin?: boolean,
  ): Promise<DBPagingResult<File>> {
    const filter: FilterQuery<File> = {
      _id: idToObjectIDOrOriginal(searchOptions.id),
      createdByTask: idToObjectIDOrOriginal(searchOptions.createdByTask),
      name: searchOptions.name,
      'metadata.managedObjectId': searchOptions.managedObjectId,
      'metadata.managedObjectName': searchOptions.managedObjectName,
      'metadata.valueFragments.type': searchOptions.valueFragmentType,
      'metadata.valueFragments.description':
        searchOptions.valueFragmentDisplayName,
      $expr: isPresent(searchOptions.sensors)
        ? {
            $gt: [
              {
                $size: {
                  $setIntersection: [
                    searchOptions.sensors,
                    '$metadata.sensors',
                  ],
                },
              },
              0,
            ],
          }
        : undefined,
      'metadata.dateFrom': isPresent(searchOptions.dateFrom)
        ? { $gte: new Date(searchOptions.dateFrom) }
        : undefined,
      'metadata.dateTo': isPresent(searchOptions.dateTo)
        ? { $lte: new Date(searchOptions.dateTo) }
        : undefined,
    };

    if (!isAdmin) {
      filter['visibilityState.published'] = true;
    }

    const paginatedResponse = await this.skipPagingService.findWithPagination({
      model: this.fileModel,
      filter: removeNilProperties(filter),
      sort: { _id: -1 },
      pagingOptions: pagingOptions,
    });
    this.populateUrl(paginatedResponse.data);
    return paginatedResponse;
  }

  async findById(
    id: Types.ObjectId,
    isAdmin?: boolean,
  ): Promise<FileDocument | undefined> {
    const file = await this.fileModel.findById(id).exec();
    if (notPresent(file)) {
      return undefined;
    }

    if (!isAdmin && !file.visibilityState.published) {
      throw new ForbiddenException();
    }
    this.populateUrl(file);
    return file;
  }

  async removeMany(
    deleteInput: DeleteInputProperties,
  ): Promise<IDeleteResponse | undefined> {
    const existingFiles = await this.fileModel.find({
      _id: { $in: deleteInput.items },
    });

    if (notPresent(existingFiles) || existingFiles.length === 0) {
      return undefined;
    }
    const deleteResponse = await this.fileModel.deleteMany({
      _id: { $in: deleteInput.items },
    });

    const deletedCount = deleteResponse?.deletedCount;

    const deletedIds = await getDeletedIds(
      this.fileModel,
      existingFiles.map((file) => file._id),
    );

    const deletedIdsSet = new Set(deletedIds);
    const deletedFiles = existingFiles.filter((file) =>
      deletedIdsSet.has(file._id),
    );

    if (deletedFiles.length > 0) {
      this.messagesProducerService.sendFilesDeletionMessage({
        files: deletedFiles.map((file) => ({
          bucket: file.storage.bucket,
          path: file.storage.path,
        })),
      });
    }

    return isPresent(deletedCount) ? { deletedCount } : undefined;
  }

  async removeFile(id: Types.ObjectId) {
    const result = await this.fileModel.findByIdAndDelete(id).exec();
    if (notPresent(result)) {
      return result;
    }

    this.messagesProducerService.sendFilesDeletionMessage({
      files: [{ bucket: result.storage.bucket, path: result.storage.path }],
    });
    return result;
  }

  async getFileLink(
    id: Types.ObjectId,
    isAdmin?: boolean,
  ): Promise<FileLink | undefined> {
    const file = await this.fileModel.findById(id).exec();

    if (notPresent(file)) {
      return undefined;
    }

    if (!isAdmin && !file.visibilityState?.published) {
      throw new ForbiddenException();
    }

    return {
      id: file._id.toString(),
      url: this.getFileUrl(file.storage.bucket, file.storage.path),
      fileName: file.name,
    };
  }

  async setFileVisibilityState({
    storage,
    errorMessage,
    isSyncing,
    id,
    visibilityState,
  }: FileSetVisibilityStateParams) {
    const fileUpdate: UpdateQuery<File> = {
      'visibilityState.stateChanging': isSyncing,
    };

    if (isPresent(errorMessage)) {
      fileUpdate['visibilityState.errorMessage'] = errorMessage;
    } else {
      fileUpdate['visibilityState.published'] =
        visibilityState === VisibilityState.PUBLIC;
      if (isPresent(storage)) {
        if (isPresent(storage.bucket)) {
          fileUpdate['storage.bucket'] = storage.bucket;
        }
        if (isPresent(storage.path)) {
          fileUpdate['storage.path'] = storage.path;
        }
      }
    }
    await this.fileModel.findByIdAndUpdate(id, fileUpdate).exec();
  }

  async handleFileVisibilityChangeRequest(
    fileId: Types.ObjectId,
    visibilityState: VisibilityStateDtoProperties,
    isAdmin?: boolean,
  ): Promise<FileDocument> {
    const file = await this.findById(fileId, isAdmin);

    if (notPresent(file)) {
      throw new NotFoundException();
    }

    const fileStorage = file.storage;
    if (
      notPresent(fileStorage) ||
      notPresent(fileStorage.path) ||
      notPresent(fileStorage.bucket)
    ) {
      throw new BadRequestException(
        `Not enough information present on file storage object. Check if path and bucket are present!`,
      );
    }

    this.messagesProducerService.sendFileVisibilityStateMessage({
      newVisibilityState: visibilityState.newVisibilityState,
      fileId: file._id.toString(),
      filePath: file.storage.path,
      bucket: file.storage.bucket,
    });

    file.visibilityState = {
      exposedToPlatforms: file.visibilityState.exposedToPlatforms,
      published: file.visibilityState.published,
      stateChanging: true,
      errorMessage: undefined,
    };
    await file.save();
    return file;
  }

  private populateUrl(files: File | File[] | undefined | null) {
    ensureArray(files)
      .filter(isPresent)
      .forEach((file) => {
        if (file.visibilityState.published) {
          file.url = this.getFileUrl(file.storage.bucket, file.storage.path);
        } else {
          file.url = undefined;
        }
      });
  }

  private getFileUrl(bucket: string, pathInBucket: string): string {
    return `${this.configService.minioConfig.url}/${bucket}/${pathInBucket}`;
  }

  async setFileExposedToPlatform(
    fileIds: Types.ObjectId[],
    platform: Platform,
    exposed: boolean,
  ) {
    let updateQuery: UpdateQuery<File>;

    if (exposed) {
      updateQuery = {
        $addToSet: { 'visibilityState.exposedToPlatforms': platform },
      };
    } else {
      updateQuery = {
        $pull: {
          'visibilityState.exposedToPlatforms': platform,
        },
      };
    }

    return await this.fileModel
      .updateMany({ _id: { $in: fileIds } }, updateQuery)
      .exec();
  }

  async getFilesUnsuitableForUpload(
    fileIds: Types.ObjectId[],
  ): Promise<FileWithSensorProblem[]> {
    const files = await this.fileModel
      .find({ _id: { $in: fileIds } })
      .populate({
        path: 'metadata.sensors',
        match: { valueFragmentDisplayName: { $exists: false } },
      })
      .lean(true)
      .exec();

    const problematicFiles = files.filter((file) => {
      const filteredSensors = ensureArray(
        file.metadata.sensors as SensorType[],
      ).filter(isPresent);
      return filteredSensors.length > 0;
    });

    return problematicFiles
      .map((file) => {
        if (
          notPresent(file.metadata.sensors) ||
          notPresent(file.metadata.sensors[0]._id)
        ) {
          this.logger.warn(
            `Unable to return problem description for file id: ${file._id?.toString()} as sensor ids are missing`,
          );
          return;
        }
        return {
          fileId: file._id.toString(),
          sensor: {
            sensorId: file.metadata.sensors[0]._id.toString(),
            problem:
              'valueFragmentDisplayName must be present for uploading file to external system',
          },
        };
      })
      .filter(isPresent);
  }
}
