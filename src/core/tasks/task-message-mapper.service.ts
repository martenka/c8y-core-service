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
} from '../../models';
import { HandlersType } from '../../global/types/types';

import { SensorType } from '../../models/Sensor';
import { isPresent, notPresent } from '../../utils/validation';
import { DataUploadTaskDocument } from '../../models/task/data-upload-task';
import { MessageMap } from '../messages/types/runtypes/map';
import {
  GeneralTaskScheduledMessage,
  TaskScheduledMessageAlternatives,
} from '../messages/types/runtypes/task/messages/scheduled-messages';
import { TaskTypes } from '../messages/types/runtypes/common';
import { DataUploadMessageFile } from '../messages/types/runtypes/task/data-upload';

@Injectable()
export class TaskMessageMapperService implements OnModuleInit {
  private readonly logger = new Logger(TaskMessageMapperService.name);

  private mapperHandlers: HandlersType<
    TaskMap,
    TaskType,
    TaskScheduledMessageAlternatives
  >;

  mapTaskWithoutPayload<T extends TaskTypes>(
    task: TaskDocument,
    taskType: T,
  ): Omit<TaskScheduledMessageAlternatives, 'payload' | 'taskType'> & {
    [Key in keyof Pick<TaskScheduledMessageAlternatives, 'taskType'>]: T;
  } {
    let periodicData: GeneralTaskScheduledMessage['periodicData'];
    if (isPresent(task.metadata?.periodicData)) {
      periodicData = {
        pattern: task.metadata.periodicData.pattern,
        windowDurationSeconds: task.metadata.periodicData.windowDurationSeconds,
      };
    }

    return {
      taskType,
      taskName: task.name,
      initiatedByUser: task.initiatedByUser.toString(),
      taskId: task._id.toString(),
      periodicData: periodicData,
      firstRunAt: task.metadata.firstRunAt?.toISOString(),
    };
  }

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

  mapDataFetchTask(
    task: DataFetchTaskDocument,
  ): MessageMap['task.scheduled.data_fetch'] {
    const leanTask: DataFetchTaskType = task.toObject();

    const mappedSensorData = leanTask.payload.data
      .map(
        (
          sensorData,
        ):
          | MessageMap['task.scheduled.data_fetch']['payload']['data'][number]
          | undefined => {
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
        },
      )
      .filter(isPresent);

    const mainTaskData = this.mapTaskWithoutPayload(task, 'DATA_FETCH');

    if (notPresent(leanTask.payload.dateFrom)) {
      this.logger.error(
        `Cannot map task ${task._id.toString()} as dateFrom is missing!`,
      );
      throw new InternalServerErrorException();
    }

    return {
      ...mainTaskData,
      payload: {
        data: mappedSensorData,
        dateFrom: leanTask.payload.dateFrom.toISOString(),
        dateTo: leanTask.payload.dateTo?.toISOString(),
      },
    };
  }

  mapDataUploadTask(
    task: DataUploadTaskDocument,
  ): MessageMap['task.scheduled.data_upload'] {
    const leanTask = task.toObject();
    const mainTaskData = this.mapTaskWithoutPayload(task, 'DATA_UPLOAD');
    return {
      ...mainTaskData,
      payload: {
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
                valueFragmentDescription:
                  file.metadata.valueFragmentDescription,
                sensorDescription: file.metadata.sensorDescription,
                fileDescription: file.metadata.fileDescription,
                dateFrom: file.metadata.dateFrom.toISOString(),
                dateTo: file.metadata.dateTo.toISOString(),
              },
            };
          })
          .filter(isPresent),
      },
    };
  }

  mapObjectSyncTask(
    task: ObjectSyncTaskDocument,
  ): MessageMap['task.scheduled.object_sync'] {
    const mainTaskData = this.mapTaskWithoutPayload(task, 'OBJECT_SYNC');
    return { ...mainTaskData, payload: {} };
  }

  onModuleInit(): any {
    this.mapperHandlers = {
      ['DATA_FETCH']: (value) =>
        this.mapDataFetchTask(value as DataFetchTaskDocument),
      ['OBJECT_SYNC']: (value) =>
        this.mapObjectSyncTask(value as ObjectSyncTaskDocument),
      ['DATA_UPLOAD']: (value) =>
        this.mapDataUploadTask(value as DataUploadTaskDocument),
    };
  }
}
