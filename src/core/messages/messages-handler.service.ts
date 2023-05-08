import { Injectable, Logger } from '@nestjs/common';

import { TaskFailedMessage } from './types/message-types/messageTypes';

import { Types } from 'mongoose';

import { TaskStatusMessage } from './types/message-types/task/types';
import { TasksService } from '../tasks/tasks.service';
import { FilesService } from '../files/files.service';
import {
  isObjectSyncTaskResultMessage,
  isObjectSyncTaskStatusMessage,
} from './guards/object-sync';
import { ObjectSyncTaskMessageHandler } from './handlers/object-sync-task-message.handler';
import { TaskSteps } from '../../models';

import { VisibilityStateResultMessage } from './types/message-types/file/types';
import { isDataFetchTaskResultMessage } from './guards/data-fetch';
import { Platform } from '../../global/tokens';
import { FileSetVisibilityStateParams } from '../files/types/types';

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

    await this.tasksService.updateTaskStatus(taskId, message);

    switch (message.taskType) {
      case 'DATA_FETCH':
        if (isDataFetchTaskResultMessage(message)) {
          const files = await this.filesService.createFilesFromMessage(message);
          await this.tasksService.handleDataFetchTaskResult(
            taskId,
            message,
            files,
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
      case 'DATA_UPLOAD':
        if (message.status === TaskSteps.DONE) {
          const taskFileIds = await this.tasksService.getDataUploadTaskFileIds(
            taskId,
          );

          await this.filesService.setFileExposedToPlatform(
            taskFileIds,
            Platform.CKAN,
            true,
          );
        }
    }
  }

  async handleFileVisibilityStateResultMessage(
    message: VisibilityStateResultMessage,
  ) {
    const options: FileSetVisibilityStateParams = {
      id: new Types.ObjectId(message.fileId),
      isSyncing: false,
    };
    if ('errorMessage' in message) {
      options.errorMessage = message.errorMessage;
    } else if ('newVisibilityState' in message) {
      options.visibilityState = message.newVisibilityState;
      options.storage = {
        bucket: message.bucket,
        path: message.filePath,
      };
    }

    await this.filesService.setFileVisibilityState(options);
  }
}
