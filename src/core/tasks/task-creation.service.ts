import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateDataFetchDto } from './dto/input/create-datafetch-task.dto';
import { InjectModel } from '@nestjs/mongoose';
import {
  DataFetchPayload,
  DataFetchTaskDocument,
  DataFetchTaskModel,
  Group,
  ObjectSyncTaskDocument,
  ObjectSyncTaskModel,
  Task,
  TaskDocument,
  TaskTypes,
} from '../../models';
import { Properties } from '../../global/types/types';
import { CreateTaskDto } from './dto/input/create-task';
import { CreateObjectSyncDto } from './dto/input/create-objectsync-task';
import { TaskCreationDtosType, TaskHandlersType } from './dto/dto-map';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { Types } from 'mongoose';
import { GroupModel } from '../../models/Group';
import { WithInitiatedByUser } from '../auth/types/types';

@Injectable()
export class TaskCreationService implements OnModuleInit {
  private readonly logger = new Logger(TaskCreationService.name);

  private taskCreationHandlers: TaskHandlersType<
    TaskCreationDtosType,
    WithInitiatedByUser<CreateTaskDto>
  >;
  constructor(
    @InjectModel(TaskTypes.DATA_FETCH)
    private readonly dataFetchModel: DataFetchTaskModel,
    @InjectModel(TaskTypes.OBJECT_SYNC)
    private readonly objectSyncModel: ObjectSyncTaskModel,
    @InjectModel(Group.name) private readonly groupModel: GroupModel,
  ) {}

  private async createDataFetchTask(
    taskDetails: WithInitiatedByUser<CreateDataFetchDto>,
  ): Promise<DataFetchTaskDocument> {
    return await this.createDataFetchTaskEntity(taskDetails);
  }
  private async createObjectSyncTask(
    taskDetails: WithInitiatedByUser<CreateObjectSyncDto>,
  ): Promise<ObjectSyncTaskDocument> {
    return await this.objectSyncModel.create(
      this.createTaskData(taskDetails, {}),
    );
  }

  async createTask<T extends WithInitiatedByUser<Properties<CreateTaskDto>>>(
    taskDetails: T,
  ): Promise<TaskDocument> {
    const handler = this.taskCreationHandlers[taskDetails.taskType];
    if (isNil(handler)) {
      this.logger.error(
        `Task creation with unknown task type - ${taskDetails?.taskType}. This should not happen`,
      );
      throw new InternalServerErrorException();
    }
    return await handler(taskDetails);
  }

  private async createDataFetchTaskEntity(
    taskDetails: WithInitiatedByUser<CreateDataFetchDto>,
  ): Promise<DataFetchTaskDocument> {
    switch (taskDetails.taskPayload.entityType) {
      case 'GROUP': {
        const groupSensorIds = (
          await this.groupModel
            .findById(taskDetails.taskPayload.entities[0].id)
            .select({ sensors: 1 })
            .exec()
        ).toObject().sensors as unknown as Types.ObjectId[];

        const sensorsWithFilenames = groupSensorIds.map((sensor) => ({
          sensor,
          filename: taskDetails.taskPayload.entities[0].fileName,
        }));

        const payload: Properties<DataFetchPayload> = {
          dateFrom: taskDetails.taskPayload.dateFrom,
          dateTo: taskDetails.taskPayload.dateTo,
          data: sensorsWithFilenames,
          group: taskDetails.taskPayload.entities[0].id,
        };

        const task = await this.dataFetchModel.create(
          this.createTaskData(taskDetails, payload),
        );
        await task.populate('payload.data.sensor');
        return task;
      }
      case 'SENSOR': {
        const sensorsWithFilenames = taskDetails.taskPayload.entities.map(
          (entity) => ({
            sensor: entity.id,
            fileName: entity.fileName,
          }),
        );

        const payload: Properties<DataFetchPayload> = {
          dateFrom: taskDetails.taskPayload.dateFrom,
          dateTo: taskDetails.taskPayload.dateTo,
          data: sensorsWithFilenames,
        };

        const task = await this.dataFetchModel.create(
          this.createTaskData(taskDetails, payload),
        );
        await task.populate('payload.data.sensor');
        return task;
      }
      default:
        throw new Error(
          `Unable to construct DataFetchTask with the given type: ${taskDetails?.taskPayload?.entityType}`,
        );
    }
  }

  private createTaskData<
    T extends WithInitiatedByUser<Properties<CreateTaskDto>>,
    P extends object,
  >(taskDetails: T, taskPayload: P): Partial<Task> {
    return {
      name: taskDetails.name,
      initiatedByUser: taskDetails.initiatedByUser,
      metadata: {
        firstRunAt: taskDetails.firstRunAt,
        periodicData: taskDetails.periodicData,
      },
      payload: taskPayload,
    };
  }

  async onModuleInit(): Promise<void> {
    this.taskCreationHandlers = {
      [TaskTypes.DATA_FETCH]: (taskDetails) =>
        this.createDataFetchTask(
          taskDetails as WithInitiatedByUser<CreateDataFetchDto>,
        ),
      [TaskTypes.OBJECT_SYNC]: (taskDetails) =>
        this.createObjectSyncTask(
          taskDetails as WithInitiatedByUser<CreateObjectSyncDto>,
        ),
    };
  }
}
