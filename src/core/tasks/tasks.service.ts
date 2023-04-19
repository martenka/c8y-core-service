import { Injectable, Logger } from '@nestjs/common';
import { CreateTaskDto } from './dto/input/create-task.dto';
import { TaskCreationService } from './task-creation.service';
import {
  DataFetchTaskModel,
  SensorDataType,
  Task,
  TaskDocument,
  TaskModel,
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
  DataFetchTaskResultStatusPayload,
  TaskScheduledMessage,
  TaskStatusMessage,
} from '../messages/types/message-types/task/types';

import { hasNoOwnKeys, notNil } from '../../utils/validation';
import { TaskMessageMapperService } from './task-message-mapper.service';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { TaskFailedMessage } from '../messages/types/message-types/messageTypes';
import { TaskQueryProperties } from './query/task-query.dto';
import { removeNilProperties } from '../../utils/helpers';

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
  ) {}
  async createAndScheduleTask<T extends CreateTaskDto>(
    loggedInUserId: string,
    task: T,
  ): Promise<TaskDocument> {
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
    return await this.taskModel.findByIdAndUpdate(id, statusUpdate).exec();
  }

  async updateTaskStatus(id: Types.ObjectId, status: TaskStatus) {
    return await this.taskModel
      .findByIdAndUpdate(id, { status: status })
      .exec();
  }

  async updateDataFetchTaskResult(
    id: Types.ObjectId,
    result: TaskStatusMessage<DataFetchTaskResultStatusPayload>,
  ) {
    if (isNil(result.payload) || hasNoOwnKeys(result.payload)) {
      return;
    }

    const task = await this.dataFetchTaskModel.findById(id).exec();
    if (isNil(task)) {
      return;
    }

    task.payload.data = task.payload.data.map(
      (existingSensor): SensorDataType => {
        const sensorUpdateData = result.payload.sensors?.find(
          (sensorUpdate) =>
            sensorUpdate.sensorId === existingSensor.sensor.toString(),
        );
        if (isNil(sensorUpdateData)) {
          return existingSensor;
        }
        return {
          sensor: existingSensor.sensor,
          fileName: sensorUpdateData.fileName,
          filePath: sensorUpdateData.filePath,
          fileURL: sensorUpdateData.fileURL,
          bucket: sensorUpdateData.bucket,
        };
      },
    );
    task.status = result.status;
    await task.save();
  }
}
