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
import { notNil } from '../../utils/validation';
import { idToObjectID } from '../../utils/helpers';
import {
  DBPagingResult,
  PagingOptionsType,
} from '../../global/pagination/types';
import { SkipPagingService } from '../paging/skip-paging.service';
import { Types } from 'mongoose';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(File.name) private readonly fileModel: FileModel,
    private readonly sensorsService: SensorsService,
    private skipPagingService: SkipPagingService,
  ) {}

  async createFilesFromMessage(
    message: DataFetchTaskResult,
  ): Promise<FileDocument[]> {
    const files: FileProperties[] = [];
    const taskId = idToObjectID(message.taskId);
    for (const sensor of message.payload.sensors) {
      const existingSensor = await this.sensorsService.findOne({
        id: sensor.sensorId,
      });
      const fileStorageInfo: FileStorageProperties = {
        bucket: sensor.bucket,
        url: sensor.fileURL,
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
      };

      files.push({
        name: sensor.fileName,
        createdByTask: taskId,
        customAttributes: {},
        storage: fileStorageInfo,
        metadata: fileMetadata,
      });
    }

    return await this.fileModel.insertMany(files);
  }

  async findMany(
    pagingOptions: PagingOptionsType,
  ): Promise<DBPagingResult<File>> {
    return await this.skipPagingService.findWithPagination(
      this.fileModel,
      {},
      { _id: 1 },
      pagingOptions,
    );
  }

  async findById(id: Types.ObjectId): Promise<FileDocument | undefined> {
    return await this.fileModel.findById(id).exec();
  }
}
