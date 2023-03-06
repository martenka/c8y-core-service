import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FileTask, FileTaskModel, TaskSteps } from '../../models/FileTask';
import { BaseMessage, MessageTypes } from './types/message-types/messageTypes';
import { idToObjectID, removeNilProperties } from '../../utils/helpers';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { Types } from 'mongoose';
import { ensureArray } from '../../utils/validation';

@Injectable()
export class MessagesHandlerService {
  constructor(
    @InjectModel(FileTask.name) private fileTaskModel: FileTaskModel,
  ) {}

  async handleFileDownloadStatusMessage(
    message: BaseMessage<MessageTypes['File.DownloadStatus']>,
  ) {
    const objectId = idToObjectID(message.content.taskId);
    if (isNil(objectId)) {
      return;
    }

    const sensorData = ensureArray(message.content.data).map((value) => ({
      fileName: value.fileName,
      filePath: value.filePath,
      bucket: value.bucket,
      fileURL: value.fileURL,
      sensor: new Types.ObjectId(value.sensorId),
    }));

    await this.fileTaskModel
      .findByIdAndUpdate(
        objectId,
        removeNilProperties({
          status: message.content.status,
          'data.sensorData':
            message.content.status === TaskSteps.DONE ? sensorData : undefined,
        }),
      )
      .exec();
  }
}
