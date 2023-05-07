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
import { isNil } from '@nestjs/common/utils/shared.utils';
import { SensorType } from '../../models/Sensor';
import { notNil } from '../../utils/validation';
import { DataFetchTaskMessagePayload } from '../messages/types/message-types/task/data-fetch';
import { DataUploadTaskDocument } from '../../models/task/data-upload-task';
import { DataUploadTaskMessagePayload } from '../messages/types/message-types/task/file-upload';

@Injectable()
export class TaskMessageMapperService implements OnModuleInit {
  private readonly logger = new Logger(TaskMessageMapperService.name);

  private mapperHandlers: HandlersType<TaskMap, TaskType, object>;

  mapTaskToMessage(task: TaskDocument) {
    const handler = this.mapperHandlers[task.taskType];
    if (isNil(handler)) {
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
        if (isNil(sensorData.sensor)) {
          this.logger.warn(
            `Ignoring unknown sensor id value for task: ${leanTask._id.toString()}`,
          );
          return;
        }
        const currentSensor = sensorData.sensor as SensorType;
        return {
          fileName: sensorData.fileName,
          sensor: {
            id: currentSensor._id.toString(),
            managedObjectId: currentSensor.managedObjectId,
            fragmentType: currentSensor.valueFragmentType,
          },
        };
      })
      .filter(notNil);

    return {
      data: mappedSensorData,
      dateFrom: leanTask.payload.dateFrom,
      dateTo: leanTask.payload.dateTo,
    };
  }

  mapDataUploadTaskPayload(
    task: DataUploadTaskDocument,
  ): DataUploadTaskMessagePayload {
    const leanTask = task.toObject();
    return {
      platform: leanTask.payload.platform,
      files: leanTask.payload.files.map((file) => {
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
            dateFrom: file.metadata.dateFrom.toISOString(),
            dateTo: file.metadata.dateTo.toISOString(),
          },
        };
      }),
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
