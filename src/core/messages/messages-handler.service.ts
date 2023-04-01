import { Injectable, Logger } from '@nestjs/common';

import { TaskSteps } from '../../models/FileTask';
import { TaskFailedMessage } from './types/message-types/messageTypes';

import { Types } from 'mongoose';

import {
  DataFetchTaskResult,
  TaskStatusMessage,
} from './types/message-types/task/types';
import { TasksService } from '../tasks/tasks.service';
import { FilesService } from '../files/files.service';
import {
  isObjectSyncTaskResultMessage,
  isObjectSyncTaskStatusMessage,
} from './guards/object-sync';
import { ObjectSyncTaskMessageHandler } from './handlers/object-sync-task-message.handler';

@Injectable()
export class MessagesHandlerService {
  private readonly logger = new Logger(MessagesHandlerService.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly filesService: FilesService,
    private readonly objectSyncTaskHandler: ObjectSyncTaskMessageHandler,
  ) {}

  async handleTaskStatusMessage(message: TaskStatusMessage) {
    const taskId = new Types.ObjectId(message.taskId);

    if (message.status === TaskSteps.FAILED) {
      return await this.tasksService.setFailedTaskInfo(
        taskId,
        message as TaskFailedMessage,
      );
    }

    switch (message.taskType) {
      case 'DATA_FETCH':
        if (message.status === TaskSteps.DONE) {
          await this.tasksService.updateDataFetchTaskResult(
            taskId,
            message as DataFetchTaskResult,
          );
          await this.filesService.createFilesFromMessage(
            message as DataFetchTaskResult,
          );
        }
        return;
      case 'OBJECT_SYNC':
        if (isObjectSyncTaskStatusMessage(message)) {
          await this.objectSyncTaskHandler.handleStatusMessage(message);
        } else if (isObjectSyncTaskResultMessage(message)) {
          this.logger.log(
            `${message.taskType} synced ${message.payload.objectAmount} objects`,
          );
        }
        return;
    }

    return await this.tasksService.updateTaskStatus(taskId, message.status);
  }
}
