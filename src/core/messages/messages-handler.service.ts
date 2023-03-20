import { Injectable } from '@nestjs/common';

import { TaskSteps } from '../../models/FileTask';
import { TaskFailedMessage } from './types/message-types/messageTypes';

import { Types } from 'mongoose';

import {
  DataFetchTaskResult,
  TaskStatusMessage,
} from './types/message-types/task/types';
import { TasksService } from '../tasks/tasks.service';
import { FilesService } from '../files/files.service';

@Injectable()
export class MessagesHandlerService {
  constructor(
    private readonly tasksService: TasksService,
    private readonly filesService: FilesService,
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
    }

    return await this.tasksService.updateTaskStatus(taskId, message.status);
  }
}
