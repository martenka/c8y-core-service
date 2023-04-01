import { Injectable, Logger } from '@nestjs/common';
import { SensorsService } from '../../sensors/sensors.service';
import { ObjectSyncTaskStatusMessage } from '../types/message-types/messageTypes';
import { TasksService } from '../../tasks/tasks.service';
import { Types } from 'mongoose';
import { isSensor } from '../guards/object-sync';
import { CreateSensorDtoProperties } from '../../sensors/dto/create-sensor.dto';
import { notNil } from '../../../utils/validation';

@Injectable()
export class ObjectSyncTaskMessageHandler {
  private readonly logger = new Logger(ObjectSyncTaskMessageHandler.name);

  constructor(
    private readonly sensorsService: SensorsService,
    private readonly tasksService: TasksService,
  ) {}

  async handleStatusMessage(message: ObjectSyncTaskStatusMessage) {
    await this.tasksService.updateTaskStatus(
      new Types.ObjectId(message.taskId),
      message.status,
    );

    for (const object of message.payload.objects) {
      if (isSensor(object)) {
        const existingSensor = await this.sensorsService.findOne({
          managedObjectId: object.managedObjectId,
          managedObjectName: object.managedObjectName,
          valueFragmentType: object.valueFragmentType,
        });
        if (notNil(existingSensor)) {
          this.logger.log(
            `Skipping creation for existing sensor for triple {${existingSensor.managedObjectId},${existingSensor.managedObjectName},${existingSensor.valueFragmentType}`,
          );
          continue;
        }

        const sensorToCreate: CreateSensorDtoProperties = {
          managedObjectId: object.managedObjectId,
          managedObjectName: object.managedObjectName,
          valueFragmentType: object.valueFragmentType,
          owner: object.owner,
          type: object.type,
        };
        await this.sensorsService.createSensors([sensorToCreate]);
      }
    }
  }
}
