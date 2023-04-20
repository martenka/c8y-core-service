import { Injectable, Logger } from '@nestjs/common';

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
import { TaskSteps, VisibilityState } from '../../models';

import { isNil } from '@nestjs/common/utils/shared.utils';
import { VisibilityStateResultMessage } from './types/message-types/file/types';

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

    await this.tasksService.updateTaskStatus(taskId, message.status);

    switch (message.taskType) {
      case 'DATA_FETCH':
        if (message.status === TaskSteps.DONE) {
          await this.filesService.createFilesFromMessage(
            message as DataFetchTaskResult,
          );
        }
        await this.tasksService.updateTaskStatus(taskId, message.status);
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
  }

  async handleFileVisibilityStateResultMessage(
    message: VisibilityStateResultMessage,
  ) {
    const file = await this.filesService.findById(
      new Types.ObjectId(message.fileId),
    );

    if (isNil(file)) {
      this.logger.error(
        `Did not found file in handleFileVisibilityStateResultMessage with fileId ${message.fileId}`,
      );
      return;
    }

    file.visibilityState.stateChanging = false;
    if ('errorMessage' in message) {
      file.visibilityState.errorMessage = message.errorMessage;
    } else if ('newVisibilityState' in message) {
      file.visibilityState.published =
        message.newVisibilityState === VisibilityState.PUBLIC;
      file.storage.path = message.filePath;
      file.storage.bucket = message.bucket;
    }

    await file.save();
  }
}
