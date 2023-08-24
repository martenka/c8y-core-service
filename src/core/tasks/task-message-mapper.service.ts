import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  DataFetchTaskDocument,
  DataFetchTaskType,
  ObjectSyncTaskDocument,
  TaskDocument,
  TaskMap,
  TaskType,
  TaskTypes,
} from '../../models';
import { HandlersType } from '../../global/types/types';

import { SensorType } from '../../models/Sensor';
import { isPresent, notPresent } from '../../utils/validation';
import { DataFetchTaskMessagePayload } from '../messages/types/message-types/task/data-fetch';
import { DataUploadTaskDocument } from '../../models/task/data-upload-task';
import {
  DataUploadMessageFile,
  DataUploadTaskMessagePayload,
} from '../messages/types/message-types/task/file-upload';

@Injectable()
export class TaskMessageMapperService implements OnModuleInit {
  private readonly logger = new Logger(TaskMessageMapperService.name);

  private mapperHandlers: HandlersType<TaskMap, TaskType, object>;

  mapTaskToMessage(task: TaskDocument) {
    const handler = this.mapperHandlers[task.taskType];
    if (notPresent(handler)) {
      this.logger.error(
        `Task mapping with unknown task type - ${task?.taskType}.`,
      );
      throw new InternalServerErrorException(
        'Internal error - check server logs',
      );
    }
    return handler(task);
  }

  mapDataFetchTaskPayload(
    task: DataFetchTaskDocument,
  ): DataFetchTaskMessagePayload {
    const leanTask: DataFetchTaskType = task.toObject();

    const mappedSensorData = leanTask.payload.data
      .map((sensorData) => {
        const currentSensor = sensorData.sensor as SensorType;
        if (notPresent(currentSensor) || notPresent(currentSensor._id)) {
          this.logger.warn(
            `Ignoring unknown sensor id value for task: ${leanTask._id?.toString()}`,
          );
          return;
        }

        return {
          fileName: sensorData.fileName,
          dataId: sensorData.dataId,
          sensor: {
            id: currentSensor._id.toString(),
            managedObjectId: currentSensor.managedObjectId,
            fragmentType: currentSensor.valueFragmentType,
          },
        };
      })
      .filter(isPresent);

    return {
      data: mappedSensorData,
      dateFrom: leanTask.payload.dateFrom?.toISOString(),
      dateTo: leanTask.payload.dateTo?.toISOString(),
    };
  }

  mapDataUploadTaskPayload(
    task: DataUploadTaskDocument,
  ): DataUploadTaskMessagePayload {
    const leanTask = task.toObject();
    return {
      platform: leanTask.payload.platform,
      files: leanTask.payload.files
        .map((file): DataUploadMessageFile | undefined => {
          if (notPresent(file.metadata.valueFragmentDescription)) {
            this.logger.log(
              `Skipping file ${file.fileId?.toString()} mapping for DataUploadTask as valueFragmentDescription is not present`,
            );
            return;
          }
          return {
            fileName: file.fileName,
            storage: file.storage,
            customAttributes: file.customAttributes,
            metadata: {
              managedObjectId: file.metadata.managedObjectId,
              valueFragmentType: file.metadata.valueFragmentType,
              managedObjectName: file.metadata.managedObjectName,
              valueFragmentDescription: file.metadata.valueFragmentDescription,
              sensorDescription: file.metadata.sensorDescription,
              fileDescription: file.metadata.fileDescription,
              dateFrom: file.metadata.dateFrom.toISOString(),
              dateTo: file.metadata.dateTo.toISOString(),
            },
          };
        })
        .filter(isPresent),
    };
  }

  mapObjectSyncTaskPayload(_task: ObjectSyncTaskDocument): object {
    return {};
  }

  onModuleInit(): any {
    this.mapperHandlers = {
      [TaskTypes.DATA_FETCH]: (value) =>
        this.mapDataFetchTaskPayload(value as DataFetchTaskDocument),
      [TaskTypes.OBJECT_SYNC]: (value) =>
        this.mapObjectSyncTaskPayload(value as ObjectSyncTaskDocument),
      [TaskTypes.DATA_UPLOAD]: (value) =>
        this.mapDataUploadTaskPayload(value as DataUploadTaskDocument),
    };
  }
}
