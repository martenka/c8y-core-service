import { Injectable, Logger } from '@nestjs/common';

import { Types } from 'mongoose';

import { TasksService } from '../tasks/tasks.service';
import { FilesService } from '../files/files.service';
import {
  isObjectSyncTaskResultMessage,
  isObjectSyncTaskStatusMessage,
} from './guards/object-sync';
import { ObjectSyncTaskMessageHandler } from './handlers/object-sync-task-message.handler';

import { isDataFetchTaskResultMessage } from './guards/data-fetch';
import { Platform } from '../../global/tokens';
import { FileSetVisibilityStateParams } from '../files/types/types';
import { MessageMap } from './types/runtypes/map';

@Injectable()
export class MessagesHandlerService {
  private readonly logger = new Logger(MessagesHandlerService.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly filesService: FilesService,
    private readonly objectSyncTaskHandler: ObjectSyncTaskMessageHandler,
  ) {}

  async handleGeneralTaskStatusMessage(
    message: MessageMap['task.status'],
    inputTaskId?: Types.ObjectId,
  ) {
    const taskId = inputTaskId ?? new Types.ObjectId(message.taskId);
    await this.tasksService.updateTaskStatus(taskId, message);
  }

  async handleTaskFailedMessage(message: MessageMap['task.status.failed']) {
    const taskId = new Types.ObjectId(message.taskId);
    await this.tasksService.setFailedTaskInfo(taskId, message);
  }

  async handleTaskStatusMessage(message: MessageMap['taskStatusMessage']) {
    const taskId = new Types.ObjectId(message.taskId);

    await this.handleGeneralTaskStatusMessage(message, taskId);

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
        if (message.status === 'DONE') {
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

  async handleTaskModeChangedMessage(message: MessageMap['task.mode.changed']) {
    await this.tasksService.changeTasksModes(
      message.tasks.map((task) => task.taskId),
      message.type,
    );
  }

  async handleFileVisibilityStateResultMessage(
    message: MessageMap['file.result.visibility.state'],
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
