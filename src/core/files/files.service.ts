import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  File,
  FileDocument,
  FileMetadata,
  FileModel,
  FileProperties,
  FileStorageProperties,
  FileValueFragmentProperties,
} from '../../models';
import { DataFetchTaskResult } from '../messages/types/message-types/task/types';
import { SensorsService } from '../sensors/sensors.service';
import { ensureArray, notNil } from '../../utils/validation';
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
import { FilterQuery, Types } from 'mongoose';
import { FileQueryOptions } from './query/file-query.dto';
import { FileLink } from './types/types';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { ApplicationConfigService } from '../application-config/application-config.service';
import { DeleteInputProperties } from '../../global/dto/deletion';
import { IDeleteResponse } from '../../global/dto/types';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(File.name) private readonly fileModel: FileModel,
    private readonly configService: ApplicationConfigService,
    private readonly sensorsService: SensorsService,
    private skipPagingService: SkipPagingService,
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
      const fileStorageInfo: FileStorageProperties = {
        bucket: sensor.bucket,
        url: this.getFileUrl(sensor.bucket, sensor.filePath),
        path: sensor.filePath,
      };

      const valueFragments: FileValueFragmentProperties[] = [];
      if (notNil(existingSensor)) {
        valueFragments.push({
          type: existingSensor.valueFragmentType,
          description: existingSensor.valueFragmentDisplayName,
        });
      }

      const fileMetadata: FileMetadata = {
        managedObjectId: existingSensor?.managedObjectId.toString(),
        managedObjectName: existingSensor?.managedObjectName,
        valueFragments,
        sensors: notNil(existingSensor) ? [existingSensor._id] : [],
        dateFrom: new Date(sensor.dateFrom),
        dateTo: new Date(sensor.dateTo),
      };

      files.push({
        name: sensor.fileName,
        createdByTask: taskId,
        customAttributes: {},
        storage: fileStorageInfo,
        metadata: fileMetadata,
      });
    }

    const createdFiles = await this.fileModel.insertMany(files);
    this.populateUrl(createdFiles);
    return createdFiles;
  }

  async findMany(
    searchOptions: FileQueryOptions,
    pagingOptions: PagingOptionsType,
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
      $expr: notNil(searchOptions.sensors)
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
      'metadata.dateFrom': notNil(searchOptions.dateFrom)
        ? { $gte: new Date(searchOptions.dateFrom) }
        : undefined,
      'metadata.dateTo': notNil(searchOptions.dateTo)
        ? { $lte: new Date(searchOptions.dateTo) }
        : undefined,
    };
    const paginatedResponse = await this.skipPagingService.findWithPagination({
      model: this.fileModel,
      filter: removeNilProperties(filter),
      sort: { _id: -1 },
      pagingOptions: pagingOptions,
    });
    this.populateUrl(paginatedResponse.data);
    return paginatedResponse;
  }

  async findById(id: Types.ObjectId): Promise<FileDocument | undefined> {
    const file = await this.fileModel.findById(id).exec();
    this.populateUrl(file);
    return file;
  }

  async removeMany(
    deleteInput: DeleteInputProperties,
  ): Promise<IDeleteResponse | undefined> {
    const deleteResponse = await this.fileModel.deleteMany({
      _id: { $in: deleteInput.items },
    });

    const deletedCount = deleteResponse?.deletedCount;

    return notNil(deletedCount) ? { deletedCount } : undefined;
  }

  async removeFile(id: Types.ObjectId) {
    return await this.fileModel.findByIdAndDelete(id).exec();
  }

  async getFileLink(id: Types.ObjectId): Promise<FileLink | undefined> {
    const file = await this.fileModel.findById(id).exec();
    if (isNil(file)) {
      return undefined;
    }

    return {
      id: file._id.toString(),
      url: this.getFileUrl(file.storage.bucket, file.storage.path),
      fileName: file.name,
    };
  }

  private populateUrl(files: File | File[] | undefined | null) {
    ensureArray(files).forEach((file) => {
      file.url = this.getFileUrl(file.storage.bucket, file.storage.path);
    });
  }

  private getFileUrl(bucket: string, pathInBucket: string): string {
    return `${this.configService.minioConfig.url}/${bucket}/${pathInBucket}`;
  }
}
