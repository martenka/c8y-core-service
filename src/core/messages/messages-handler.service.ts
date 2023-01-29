import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FileTask, TaskModel } from '../../models/FileTask';
import { FileDownloadStatusMessage } from './types/messageTypes';
import { idToObjectID } from '../../utils/helpers';
import { isNil } from '@nestjs/common/utils/shared.utils';

@Injectable()
export class MessagesHandlerService {
  constructor(@InjectModel(FileTask.name) private fileTaskModel: TaskModel) {}

  async handleFileDownloadStatusMessage(message: FileDownloadStatusMessage) {
    const objectId = idToObjectID(message.taskId);
    if (isNil(objectId)) {
      return;
    }
    await this.fileTaskModel
      .findByIdAndUpdate(objectId, {
        status: message,
        data: { $set: { filePath: message.filePath } },
      })
      .exec();
  }
}
