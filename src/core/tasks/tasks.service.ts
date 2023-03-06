import { Injectable, Logger } from '@nestjs/common';
import { CreateTaskDto } from './dto/input/create-task';
import { TaskCreationService } from './task-creation.service';
import { DataFetchTaskType, Task, TaskDocument, TaskModel } from '../../models';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  DBPagingResult,
  PagingOptionsType,
} from '../../global/pagination/types';
import { SkipPagingService } from '../paging/skip-paging.service';
import { MessagesProducerService } from '../messages/messages-producer.service';
import {
  DataFetchTaskMessagePayload,
  TaskScheduledMessage,
} from '../messages/types/message-types/task/types';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { SensorType } from '../../models/Sensor';
import { notNil } from '../../utils/validation';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly messageProducerService: MessagesProducerService,
    private readonly taskCreationService: TaskCreationService,
    private skipPagingService: SkipPagingService,
    @InjectModel(Task.name) private readonly taskModel: TaskModel,
  ) {}
  async createTask<T extends CreateTaskDto>(task: T): Promise<TaskDocument> {
    const createdTask = await this.taskCreationService.createTask(task);
    await createdTask.populate('payload.data.sensor');

    const leanTask: DataFetchTaskType = createdTask.toObject();

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
            managedObjectId: currentSensor.managedObjectId,
            fragmentType: currentSensor.valueFragmentType,
          },
        };
      })
      .filter(notNil);

    let periodicData;
    if (notNil(leanTask.metadata.periodicData)) {
      periodicData = {
        pattern: leanTask.metadata.periodicData.pattern,
        firstRunAt: leanTask.metadata.periodicData.firstRunAt,
        fetchDuration: leanTask.metadata.periodicData.fetchDuration,
      };
    }

    const message: TaskScheduledMessage<DataFetchTaskMessagePayload> = {
      taskType: leanTask.taskType,
      taskId: leanTask._id.toString(),
      payload: {
        dateFrom: leanTask.payload.dateFrom,
        dateTo: leanTask.payload.dateTo,
        data: mappedSensorData,
      },
      periodicData: periodicData,
      customAttributes: leanTask.customAttributes,
    };

    this.messageProducerService.sendTaskScheduledMessage(message);

    return createdTask.depopulate();
  }

  async findById(id: Types.ObjectId): Promise<TaskDocument | undefined> {
    return this.taskModel.findById(id).exec();
  }

  async findMany(
    pagingOptions: PagingOptionsType,
  ): Promise<DBPagingResult<Task>> {
    return await this.skipPagingService.findWithPagination(
      this.taskModel,
      {},
      { _id: 1 },
      pagingOptions,
    );
  }
}
