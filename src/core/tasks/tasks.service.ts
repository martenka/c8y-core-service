import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from './dto/input/create-task.dto';
import { TaskCreationService } from './task-creation.service';
import {
  DataFetchTaskModel,
  FileDocument,
  ObjectSyncTaskModel,
  SensorDataType,
  Task,
  TaskDocument,
  TaskDocumentSubtypes,
  TaskMode,
  TaskModel,
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

import { ensureArray, hasNoOwnKeys, notNil } from '../../utils/validation';
import { TaskMessageMapperService } from './task-message-mapper.service';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { TaskFailedMessage } from '../messages/types/message-types/messageTypes';
import { TaskQueryProperties } from './query/task-query.dto';
import {
  convertArrayToMap,
  exhaustiveCheck,
  idToObjectIDOrUndefined,
  parseDateOrNow,
  removeNilProperties,
} from '../../utils/helpers';
import {
  DataFetchTaskResultFile,
  DataFetchTaskResultStatusPayload,
} from '../messages/types/message-types/task/data-fetch';

import {
  DataUploadTaskDocument,
  DataUploadTaskModel,
} from '../../models/task/data-upload-task';
import { AlreadyExistsException } from '../../global/exceptions/already-exists.exception';
import * as crypto from 'crypto';
import { TaskModeDto } from './dto/input/task-mode.dto';

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
    @InjectModel(TaskTypes.OBJECT_SYNC)
    private readonly objectSyncTaskModel: ObjectSyncTaskModel,
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
    const task = await this.taskModel.findById(id).exec();

    return this.convertTaskToSubtask(task);
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
        'metadata.lastFailedAt': parseDateOrNow(message.timestamp),
      };
    }
    return await this.taskModel
      .findByIdAndUpdate(id, statusUpdate, { returnDocument: 'after' })
      .exec();
  }

  async updateTaskStatus(id: Types.ObjectId, statusMessage: TaskStatusMessage) {
    const update: UpdateQuery<Task> = {
      status: statusMessage.status,
    };

    if (statusMessage.status === TaskSteps.PROCESSING) {
      update['metadata.lastRanAt'] = parseDateOrNow(statusMessage.timestamp);
    }
    return await this.taskModel.findByIdAndUpdate(id, update).exec();
  }

  async sendTaskMode(taskStatusBody: TaskModeDto) {
    const dbTasks = await this.taskModel
      .find({
        _id: { $in: taskStatusBody.taskIds },
      })
      .select({ _id: 1 })
      .exec();

    const dbTaskIds = dbTasks.map((task) => task._id.toString());
    const dbTaskSet = new Set(dbTaskIds);

    const tasksNotInDB = taskStatusBody.taskIds.filter(
      (id) => !dbTaskSet.has(id.toString()),
    );

    if (tasksNotInDB.length > 0) {
      throw new NotFoundException(
        'Check input - found taskIds from input that are not present in database',
      );
    }

    this.messageProducerService.sendTaskModeUpdateMessage({
      type: taskStatusBody.type,
      tasks: dbTaskIds.map((id) => ({ taskId: id.toString() })),
    });
  }

  /**
   * Updates task data using data-fetch task result message.
   * Saves down the actual file storage bucket and path, updated filename and created file id if present
   * If necessary, adds newly created to task payload
   * @param taskId - Id of the task to update
   * @param result - Task result message
   * @param createdFiles - Files created previously from the same task result message
   */
  async handleDataFetchTaskResult(
    taskId: Types.ObjectId,
    result: TaskStatusMessage<DataFetchTaskResultStatusPayload>,
    createdFiles: FileDocument[] = [],
  ) {
    if (isNil(result.payload) || hasNoOwnKeys(result.payload)) {
      this.logger.log(
        `Data fetch task result payload is empty, not updating task ${taskId.toString()}`,
      );
      return;
    }

    const task = await this.dataFetchTaskModel.findById(taskId).exec();
    if (isNil(task)) {
      this.logger.log(
        `Did not find task with id ${taskId.toString()} in data-fetch task result handler`,
      );
      return;
    }
    const createdFilesByFileNameMap = convertArrayToMap(
      createdFiles,
      (file) => {
        return file.name;
      },
    );

    const existingTaskDataByDataId = convertArrayToMap(
      task.payload.data,
      (entity) => entity.dataId,
    );

    for (const file of result.payload.sensors) {
      const dataId = file.dataId;
      const existingSensorData = existingTaskDataByDataId.get(dataId);

      const newFile = createdFilesByFileNameMap.get(file.fileName);
      /**
       * If file data already exists under task payload, then update its fields
       * Otherwise add new file data entity to task payload
       */
      if (notNil(existingSensorData)) {
        existingTaskDataByDataId.set(dataId, {
          ...this.mapFileToSensorData(file, newFile?._id.toString()),
          sensor: existingSensorData.sensor,
        });
      } else {
        if (isNil(newFile)) {
          this.logger.log(
            `Received new file ${file?.fileName} but have no matching file entity.\n Skipping adding new file to existing task payload`,
          );
          continue;
        }

        existingTaskDataByDataId.set(
          crypto.randomUUID(),
          this.mapFileToSensorData(file, newFile._id.toString()),
        );
      }
    }

    const updatedTaskDataArray: SensorDataType[] = [];
    existingTaskDataByDataId.forEach((sensorData) => {
      updatedTaskDataArray.push(sensorData);
    });

    task.payload.data = updatedTaskDataArray;
    if (notNil(result.payload.completedAt)) {
      task.metadata.lastCompletedAt = new Date(result.payload.completedAt);
    }
    task.status = TaskSteps.DONE;
    return await task.save();
  }

  async changeTasksModes(taskIds: string[], mode: TaskMode) {
    const ids = ensureArray(idToObjectIDOrUndefined(taskIds));
    await this.taskModel.updateMany({ _id: { $in: ids } }, { mode: mode });
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

  private mapFileToSensorData(
    file: DataFetchTaskResultFile,
    fileId?: string,
  ): SensorDataType {
    return {
      fileName: file.fileName,
      sensor: new Types.ObjectId(file.sensorId),
      filePath: file.filePath,
      bucket: file.bucket,
      fileId: fileId,
      dataId: file.dataId ?? crypto.randomUUID(),
    };
  }

  private convertTaskToSubtask(task: TaskDocument): TaskDocumentSubtypes {
    const leanTask = task.toObject({ transform: false });
    switch (task.taskType) {
      case 'DATA_FETCH':
        return this.dataFetchTaskModel.hydrate(leanTask);
      case 'DATA_UPLOAD':
        return this.dataUploadTaskModel.hydrate(leanTask);
      case 'OBJECT_SYNC':
        return this.objectSyncTaskModel.hydrate(leanTask);
    }

    exhaustiveCheck(task.taskType, 'CTTST');
  }
}
