import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateDataFetchDto } from './dto/input/create-datafetch-task.dto';
import { InjectModel } from '@nestjs/mongoose';
import {
  CustomAttributes,
  DataFetchPayload,
  DataFetchTaskDocument,
  DataFetchTaskModel,
  File,
  FileDocument,
  FileModel,
  Group,
  ObjectSyncTaskDocument,
  ObjectSyncTaskModel,
  Task,
  TaskDocument,
  TaskTypes,
} from '../../models';
import { Properties } from '../../global/types/types';
import { CreateTaskDto } from './dto/input/create-task.dto';
import { CreateObjectSyncDto } from './dto/input/create-objectsync-task.dto';
import { TaskCreationDtosType, TaskHandlersType } from './dto/dto-map';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { Types } from 'mongoose';
import { GroupModel } from '../../models/Group';
import { WithInitiatedByUser } from '../auth/types/types';
import { CreateDataUploadTaskDtoProperties } from './dto/input/create-dataupload-task.dto';
import {
  DataUploadTaskDocument,
  DataUploadTaskFileMetadataProperties,
  DataUploadTaskFileProperties,
  DataUploadTaskModel,
  DataUploadTaskPayloadProperties,
} from '../../models/task/data-upload-task';
import { SensorType } from '../../models/Sensor';
import { Platform } from '../../global/tokens';
import { FilesService } from '../files/files.service';
import { CustomException } from '../../global/exceptions/custom.exception';

@Injectable()
export class TaskCreationService implements OnModuleInit {
  private readonly logger = new Logger(TaskCreationService.name);

  private taskCreationHandlers: TaskHandlersType<
    TaskCreationDtosType,
    WithInitiatedByUser<CreateTaskDto>
  >;
  constructor(
    @InjectModel(TaskTypes.DATA_FETCH)
    private readonly dataFetchModel: DataFetchTaskModel,
    @InjectModel(TaskTypes.OBJECT_SYNC)
    private readonly objectSyncModel: ObjectSyncTaskModel,
    @InjectModel(TaskTypes.DATA_UPLOAD)
    private readonly dataUploadModel: DataUploadTaskModel,
    @InjectModel(Group.name) private readonly groupModel: GroupModel,
    @InjectModel(File.name) private readonly fileModel: FileModel,
    private readonly filesService: FilesService,
  ) {}

  private async createDataFetchTask(
    taskDetails: WithInitiatedByUser<CreateDataFetchDto>,
  ): Promise<DataFetchTaskDocument> {
    return await this.createDataFetchTaskEntity(taskDetails);
  }
  private async createObjectSyncTask(
    taskDetails: WithInitiatedByUser<CreateObjectSyncDto>,
  ): Promise<ObjectSyncTaskDocument> {
    return await this.objectSyncModel.create(
      this.createTaskData(taskDetails, {}),
    );
  }

  /**
   * Creates new DataUploadTask entity. If sensor entity from file cannot be used for the most up to date info, then uses
   * metadata already present on the file entity.
   *
   * @throws BadRequestException if no files are found from the database for given file ids
   */
  private async createDataUploadTask(
    taskDetails: WithInitiatedByUser<CreateDataUploadTaskDtoProperties>,
  ): Promise<DataUploadTaskDocument> {
    const taskPayload = taskDetails.taskPayload;
    const files: FileDocument[] = await this.fileModel
      .find({
        _id: { $in: taskPayload.fileIds },
        'visibilityState.exposedToPlatforms': {
          $ne: Platform.CKAN,
        },
      })
      .populate('metadata.sensors')
      .exec();

    if (isNil(files) || files.length === 0) {
      throw new BadRequestException(
        `Could not find suitable files to upload with given ids - Already present files won't be uploaded`,
      );
    }

    const problematicFiles =
      await this.filesService.getFilesUnsuitableForUpload(taskPayload.fileIds);
    if (problematicFiles.length > 0) {
      throw new CustomException(
        'Unable to upload files, please check that all sensors in all files of this task payload have valueFragmentDescription/DisplayName field present',
      );
    }

    const dataUploadTaskFiles: DataUploadTaskFileProperties[] = [];

    for (const file of files) {
      const fileSensor: SensorType | undefined | Types.ObjectId =
        file.metadata?.sensors?.[0];
      const fileMetadata = file.metadata;

      let dataUploadCustomAttributes: CustomAttributes =
        file.customAttributes ?? {};

      let dataUploadFileMetadata: DataUploadTaskFileMetadataProperties;
      if (isNil(fileSensor) || fileSensor instanceof Types.ObjectId) {
        if (
          isNil(fileMetadata.managedObjectId) ||
          isNil(fileMetadata.valueFragments) ||
          fileMetadata.valueFragments.length === 0
        ) {
          this.logger.warn(
            `createDataUploadTask: Could not find managedObjectId or valueFragmentType for taskId ${file._id.toString()}. Skipping this file`,
          );
          continue;
        }

        dataUploadFileMetadata = {
          dateTo: fileMetadata.dateTo,
          dateFrom: fileMetadata.dateFrom,
          managedObjectName: fileMetadata.managedObjectName,
          valueFragmentType: fileMetadata.valueFragments[0].type,
          valueFragmentDescription: fileMetadata.valueFragments[0].description,
          managedObjectId: fileMetadata.managedObjectId,
          fileDescription: file.description,
        };
      } else {
        dataUploadFileMetadata = {
          dateTo: file.metadata.dateTo,
          dateFrom: file.metadata.dateFrom,
          managedObjectId: fileSensor.managedObjectId,
          managedObjectName: fileSensor.managedObjectName,
          valueFragmentType: fileSensor.valueFragmentType,
          valueFragmentDescription: fileSensor.valueFragmentDisplayName,
          type: fileSensor.type,
          sensorDescription: fileSensor.description,
          fileDescription: file.description,
        };
        dataUploadCustomAttributes = Object.assign(
          dataUploadCustomAttributes,
          fileSensor.customAttributes,
        );
      }
      const dataUploadFile: DataUploadTaskFileProperties = {
        fileId: file._id,
        fileName: file.name,
        customAttributes: file.customAttributes,
        storage: {
          path: file.storage.path,
          bucket: file.storage.bucket,
        },
        metadata: dataUploadFileMetadata,
      };

      dataUploadTaskFiles.push(dataUploadFile);
    }

    return await this.dataUploadModel.create(
      this.createTaskData<DataUploadTaskPayloadProperties>(taskDetails, {
        files: dataUploadTaskFiles,
        platform: {
          platformIdentifier: Platform.CKAN,
        },
      }),
    );
  }

  async createTask<T extends WithInitiatedByUser<Properties<CreateTaskDto>>>(
    taskDetails: T,
  ): Promise<TaskDocument> {
    const handler = this.taskCreationHandlers[taskDetails.taskType];
    if (isNil(handler)) {
      this.logger.error(
        `Task creation with unknown task type - ${taskDetails?.taskType}. This should not happen`,
      );
      throw new InternalServerErrorException();
    }
    return await handler(taskDetails);
  }

  private async createDataFetchTaskEntity(
    taskDetails: WithInitiatedByUser<CreateDataFetchDto>,
  ): Promise<DataFetchTaskDocument> {
    switch (taskDetails.taskPayload.entityType) {
      case 'GROUP': {
        const groupSensorIds = (
          await this.groupModel
            .findById(taskDetails.taskPayload.entities[0].id)
            .select({ sensors: 1 })
            .exec()
        ).toObject().sensors as unknown as Types.ObjectId[];

        const sensorsWithFilenames = groupSensorIds.map((sensor) => ({
          sensor,
          filename: taskDetails.taskPayload.entities[0].fileName,
        }));

        const payload: Properties<DataFetchPayload> = {
          dateFrom: taskDetails.taskPayload.dateFrom,
          dateTo: taskDetails.taskPayload.dateTo,
          data: sensorsWithFilenames,
          group: taskDetails.taskPayload.entities[0].id,
        };

        const task = await this.dataFetchModel.create(
          this.createTaskData(taskDetails, payload),
        );
        await task.populate('payload.data.sensor');
        return task;
      }
      case 'SENSOR': {
        const sensorsWithFilenames = taskDetails.taskPayload.entities.map(
          (entity) => ({
            sensor: entity.id,
            fileName: entity.fileName,
          }),
        );

        const payload: Properties<DataFetchPayload> = {
          dateFrom: taskDetails.taskPayload.dateFrom,
          dateTo: taskDetails.taskPayload.dateTo,
          data: sensorsWithFilenames,
        };

        const task = await this.dataFetchModel.create(
          this.createTaskData(taskDetails, payload),
        );
        await task.populate('payload.data.sensor');
        return task;
      }
      default:
        throw new Error(
          `Unable to construct DataFetchTask with the given type: ${taskDetails?.taskPayload?.entityType}`,
        );
    }
  }

  private createTaskData<
    P extends object,
    T extends WithInitiatedByUser<
      Properties<CreateTaskDto>
    > = WithInitiatedByUser<Properties<CreateTaskDto>>,
  >(taskDetails: T, taskPayload: P): Partial<Task> {
    return {
      name: taskDetails.name,
      initiatedByUser: taskDetails.initiatedByUser,
      metadata: {
        firstRunAt: taskDetails.firstRunAt,
        periodicData: taskDetails.periodicData,
      },
      payload: taskPayload,
    };
  }

  async onModuleInit(): Promise<void> {
    this.taskCreationHandlers = {
      [TaskTypes.DATA_FETCH]: (taskDetails) =>
        this.createDataFetchTask(
          taskDetails as WithInitiatedByUser<CreateDataFetchDto>,
        ),
      [TaskTypes.OBJECT_SYNC]: (taskDetails) =>
        this.createObjectSyncTask(
          taskDetails as WithInitiatedByUser<CreateObjectSyncDto>,
        ),
      [TaskTypes.DATA_UPLOAD]: (taskDetails) =>
        this.createDataUploadTask(
          taskDetails as WithInitiatedByUser<CreateDataUploadTaskDtoProperties>,
        ),
    };
  }
}
