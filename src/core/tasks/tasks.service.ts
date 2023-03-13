import { Injectable, Logger } from '@nestjs/common';
import { CreateTaskDto } from './dto/input/create-task';
import { TaskCreationService } from './task-creation.service';
import { Task, TaskDocument, TaskModel } from '../../models';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  DBPagingResult,
  PagingOptionsType,
} from '../../global/pagination/types';
import { SkipPagingService } from '../paging/skip-paging.service';
import { MessagesProducerService } from '../messages/messages-producer.service';
import { TaskScheduledMessage } from '../messages/types/message-types/task/types';

import { notNil } from '../../utils/validation';
import { TaskMessageMapperService } from './task-message-mapper.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly messageProducerService: MessagesProducerService,
    private readonly taskCreationService: TaskCreationService,
    private readonly taskMessageMapperService: TaskMessageMapperService,
    private skipPagingService: SkipPagingService,
    @InjectModel(Task.name) private readonly taskModel: TaskModel,
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
        fetchDuration: createdTask.metadata.periodicData.fetchDuration,
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
    pagingOptions: PagingOptionsType,
  ): Promise<DBPagingResult<Task>> {
    return await this.skipPagingService.findWithPagination(
      this.taskModel,
      {},
      { _id: 1 },
      pagingOptions,
    );
  }
}
