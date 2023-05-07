import { Injectable, Logger } from '@nestjs/common';
import { CreateTaskDto } from './dto/input/create-task.dto';
import { TaskCreationService } from './task-creation.service';
import {
  DataFetchTaskModel,
  FileDocument,
  SensorDataType,
  Task,
  TaskDocument,
  TaskModel,
  TaskSchema,
  TaskStatus,
  TaskSteps,
  TaskType,
  TaskTypes,
} from '../../models';
import { FilterQuery, Types, UpdateQuery } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  DBPagingResult,
  PagingOptionsType,
} from '../../global/pagination/types';
import { SkipPagingService } from '../paging/skip-paging.service';
import { MessagesProducerService } from '../messages/messages-producer.service';
import {
  TaskScheduledMessage,
  TaskStatusMessage,
} from '../messages/types/message-types/task/types';

import { hasNoOwnKeys, notNil } from '../../utils/validation';
import { TaskMessageMapperService } from './task-message-mapper.service';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { TaskFailedMessage } from '../messages/types/message-types/messageTypes';
import { TaskQueryProperties } from './query/task-query.dto';
import { convertArrayToMap, removeNilProperties } from '../../utils/helpers';
import { DataFetchTaskResultStatusPayload } from '../messages/types/message-types/task/data-fetch';

import {
  DataUploadTaskDocument,
  DataUploadTaskModel,
} from '../../models/task/data-upload-task';
import { AlreadyExistsException } from '../../global/exceptions/already-exists.exception';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly messageProducerService: MessagesProducerService,
    private readonly taskCreationService: TaskCreationService,
    private readonly taskMessageMapperService: TaskMessageMapperService,
    private skipPagingService: SkipPagingService,
    @InjectModel(Task.name) private readonly taskModel: TaskModel,
    @InjectModel(TaskTypes.DATA_FETCH)
    private readonly dataFetchTaskModel: DataFetchTaskModel,
    @InjectModel(TaskTypes.DATA_UPLOAD)
    private readonly dataUploadTaskModel: DataUploadTaskModel,
  ) {}
  async createAndScheduleTask<T extends CreateTaskDto>(
    loggedInUserId: string,
    task: T,
  ): Promise<TaskDocument> {
    const existingTask = await this.taskModel
      .findOne({ name: task.name })
      .exec();

    if (notNil(existingTask)) {
      throw new AlreadyExistsException(`Task ${task.name} already exists!`);
    }

    const createdTask = await this.taskCreationService.createTask({
      ...task,
      initiatedByUser: new Types.ObjectId(loggedInUserId),
    });

    const mappedPayload =
      this.taskMessageMapperService.mapTaskToMessage(createdTask);

    let periodicData;
    if (notNil(createdTask.metadata?.periodicData)) {
      periodicData = {
        pattern: createdTask.metadata.periodicData.pattern,
        fetchDurationSeconds:
          createdTask.metadata.periodicData.fetchDurationSeconds,
      };
    }

    const message: TaskScheduledMessage = {
      taskType: createdTask.taskType,
      taskName: createdTask.name,
      initiatedByUser: loggedInUserId,
      taskId: createdTask._id.toString(),
      payload: mappedPayload,
      periodicData: periodicData,
      firstRunAt: createdTask.metadata.firstRunAt?.toISOString(),
      customAttributes: createdTask.customAttributes,
    };

    this.messageProducerService.sendTaskScheduledMessage(message);

    return createdTask.depopulate();
  }

  async findById(id: Types.ObjectId): Promise<TaskDocument | undefined> {
    return this.taskModel.findById(id).exec();
  }

  async findMany(
    searchQuery: TaskQueryProperties,
    pagingOptions: PagingOptionsType,
  ): Promise<DBPagingResult<Task>> {
    const filter: FilterQuery<Task> = {
      taskType: searchQuery.taskType,
      _id: searchQuery.id,
      name: searchQuery.name,
      status: searchQuery.taskStatus,
      'metadata.periodicData': notNil(searchQuery.isPeriodic)
        ? { $exists: searchQuery.isPeriodic }
        : undefined,
      'metadata.firstRunAt': notNil(searchQuery.firstRunAt)
        ? { $gte: new Date(searchQuery.firstRunAt) }
        : undefined,
    };

    return await this.skipPagingService.findWithPagination({
      model: this.taskModel,
      filter: removeNilProperties(filter),
      sort: { _id: -1 },
      pagingOptions: pagingOptions,
      queryOptions: {
        strictQuery: false,
      },
    });
  }

  async setFailedTaskInfo(
    id: Types.ObjectId,
    message: Omit<TaskFailedMessage, 'taskId'> | string,
  ) {
    let statusUpdate: UpdateQuery<TaskType> = {};

    if (typeof message === 'string') {
      statusUpdate = {
        ...statusUpdate,
        status: TaskSteps.FAILED,
        'metadata.lastFailReason': message,
        'metadata.lastFailedAt': new Date(),
      };
    } else {
      statusUpdate = {
        ...statusUpdate,
        status: message.status,
        'metadata.lastFailReason': message.payload.reason,
        'metadata.lastFailedAt': new Date(),
      };
    }
    return await this.taskModel
      .findByIdAndUpdate(id, statusUpdate, { returnDocument: 'after' })
      .exec();
  }

  async updateTaskStatus(id: Types.ObjectId, status: TaskStatus) {
    return await this.taskModel
      .findByIdAndUpdate(id, { status: status })
      .exec();
  }

  /**
   * Updates task data using data-fetch task result message.
   * Saves down the actual file storage bucket and path, updated filename and created file id if present
   * @param taskId - Id of the task to update
   * @param result - Task result message
   * @param files - Files created previously from the same task result message
   */
  async updateDataFetchTaskResult(
    taskId: Types.ObjectId,
    result: TaskStatusMessage<DataFetchTaskResultStatusPayload>,
    files: FileDocument[] = [],
  ) {
    if (isNil(result.payload) || hasNoOwnKeys(result.payload)) {
      this.logger.log(
        `Data fetch task result payload is empty, not doing update for task ${taskId.toString()}`,
      );
      return;
    }

    const task = await this.dataFetchTaskModel.findById(taskId).exec();
    if (isNil(task)) {
      this.logger.log(
        `Did not found task with id ${taskId.toString()} in data-fetch task result handler`,
      );
      return;
    }

    const filesBySensorIdMap = convertArrayToMap(files, (file) => {
      return file.metadata?.sensors[0]?._id.toString();
    });

    task.status = TaskSteps.DONE;
    if (notNil(result.payload.completedAt)) {
      task.metadata.lastCompletedAt = new Date(result.payload.completedAt);
    }
    task.payload.data = task.payload.data.map(
      (existingSensor): SensorDataType => {
        const sensorUpdateData = result.payload.sensors?.find(
          (sensorUpdate) =>
            sensorUpdate.sensorId === existingSensor.sensor.toString(),
        );
        if (isNil(sensorUpdateData)) {
          this.logger.log(
            `Sensor ${existingSensor.sensor.toString()} not found in data-fetch result message. \nSkipping update for this sensor. Message sensors: ${result?.payload?.sensors
              ?.map((sensor) => sensor?.sensorId)
              .join(' , ')}`,
          );
          return existingSensor;
        }

        const matchingFile = filesBySensorIdMap.get(sensorUpdateData.sensorId);
        this.logger.log(
          `No matching file found for sensorId ${sensorUpdateData.sensorId} . Not setting fileId to task entity`,
        );
        return {
          sensor: existingSensor.sensor,
          fileName: sensorUpdateData.fileName,
          fileId: matchingFile?.id,
          filePath: sensorUpdateData.filePath,
          fileURL: sensorUpdateData.fileURL,
          bucket: sensorUpdateData.bucket,
        };
      },
    );
    return await task.save();
  }

  async getDataUploadTaskFileIds(
    taskId: Types.ObjectId,
  ): Promise<Types.ObjectId[]> {
    const task: DataUploadTaskDocument | undefined =
      await this.dataUploadTaskModel.findById(taskId);
    if (isNil(task)) {
      this.logger.log(
        `Can't update files exposed to platform setting - did not find DataUploadTask for id: ${taskId.toString()}`,
      );
      return [];
    }

    const fileIds = task.payload.files.map((file) => file?.fileId);
    return fileIds.filter(notNil);
  }
}
