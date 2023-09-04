import { Injectable, Logger } from '@nestjs/common';
import { SensorsService } from '../../sensors/sensors.service';
import { Types } from 'mongoose';
import { isGroup, isSensor } from '../guards/object-sync';
import { GroupsService } from '../../groups/groups.service';
import { SensorDocument } from '../../../models/Sensor';
import { isPresent, notPresent } from '../../../utils/validation';
import { GroupDocument } from '../../../models/Group';
import {
  CreateSensorDto,
  CreateSensorDtoProperties,
} from '../../sensors/dto/create-sensor.dto';
import { MessageMap } from '../types/runtypes/map';
import { Group, Sensor } from '../types/runtypes/task/object-sync';

@Injectable()
export class ObjectSyncTaskMessageHandler {
  private readonly logger = new Logger(ObjectSyncTaskMessageHandler.name);

  constructor(
    private readonly sensorsService: SensorsService,
    private readonly groupsService: GroupsService,
  ) {}

  async handleStatusMessage(message: MessageMap['task.status.object_sync']) {
    for (const object of message.payload.objects) {
      if (isSensor(object)) {
        const existingSensor = await this.sensorsService.findOne({
          managedObjectId: object.managedObjectId,
          managedObjectName: object.managedObjectName,
          valueFragmentType: object.valueFragmentType,
        });
        if (isPresent(existingSensor)) {
          this.logger.log(
            `Skipping creation for existing sensor for triple {${existingSensor.managedObjectId},${existingSensor.managedObjectName},${existingSensor.valueFragmentType}}`,
          );
          continue;
        }

        if (notPresent(object.valueFragmentType)) {
          this.logger.log(
            'Skipping creation of sensor as valueFragmentType is missing',
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
      } else if (isGroup(object)) {
        await this.saveGroup(object);
      }
    }
  }

  async saveGroup(group: Group) {
    // Check if input sensors and groups already exist in db
    // and use existing ids for existing objects

    const inputGroupSensors = group.objects.filter(isSensor);
    const inputGroupNestedGroups = group.objects.filter(isGroup);

    const groupSensorIds = await this.getAndCreateGroupSensorIds(
      inputGroupSensors,
    );

    const groupNestedGroupsIds = await this.getAndCreateNestedGroupIds(
      inputGroupNestedGroups,
    );

    const existingGroup: GroupDocument | undefined =
      await this.groupsService.findOne({
        managedObjectId: group.managedObjectId,
      });

    if (isPresent(existingGroup)) {
      await this.groupsService.updateGroups([
        {
          id: existingGroup._id.toString(),
          sensors: groupSensorIds,
          groups: groupNestedGroupsIds,
        },
      ]);
    } else {
      await this.mapAndCreateGroup(group, groupSensorIds, groupNestedGroupsIds);
    }
  }

  async getAndCreateGroupSensorIds(
    inputGroupSensors: Sensor[],
  ): Promise<Types.ObjectId[]> {
    const groupSensorIds: Types.ObjectId[] = [];

    const existingSensors = await this.sensorsService.findManyByFilterQuery({
      $or: inputGroupSensors.map((sensor) => ({
        managedObjectId: sensor.managedObjectId,
        managedObjectName: sensor.managedObjectName,
        valueFragmentType: sensor.valueFragmentType,
      })),
    });

    for (const inputSensor of inputGroupSensors) {
      let sensorId: Types.ObjectId;
      const existingSensor: SensorDocument | undefined = existingSensors.find(
        (sensor) =>
          sensor.managedObjectId === inputSensor.managedObjectId &&
          sensor.managedObjectName === inputSensor.managedObjectName &&
          sensor.valueFragmentType === inputSensor.valueFragmentType,
      );

      if (isPresent(existingSensor)) {
        sensorId = existingSensor._id;
      } else {
        if (notPresent(inputSensor.valueFragmentType)) {
          this.logger.log(
            'Skipping creation of group sensor as valueFragmentType is missing',
          );
          continue;
        }
        const sensorToCreate: CreateSensorDto = {
          managedObjectId: inputSensor.managedObjectId,
          managedObjectName: inputSensor.managedObjectName,
          valueFragmentType: inputSensor.valueFragmentType,
          type: inputSensor.type,
          owner: inputSensor.owner,
        };
        const createdSensor = await this.sensorsService.createSensors([
          sensorToCreate,
        ]);
        if (notPresent(createdSensor)) {
          this.logger.error(
            'Skipping creating a sensor due to a problem',
            sensorToCreate,
          );
          continue;
        }
        sensorId = createdSensor[0]._id;
      }
      groupSensorIds.push(sensorId);
    }
    return groupSensorIds;
  }

  async getAndCreateNestedGroupIds(
    inputNestedGroups: Group[],
  ): Promise<Types.ObjectId[]> {
    const nestedGroupIds: Types.ObjectId[] = [];

    for (const nestedGroup of inputNestedGroups) {
      const existingNestedGroup: GroupDocument | undefined =
        await this.groupsService.findOne({
          managedObjectId: nestedGroup.managedObjectId,
        });
      if (isPresent(existingNestedGroup)) {
        nestedGroupIds.push(existingNestedGroup._id);
      } else {
        const createdGroup = await this.mapAndCreateGroup(nestedGroup);
        if (isPresent(createdGroup) && createdGroup.length > 0) {
          nestedGroupIds.push(createdGroup[0]._id);
        }
      }
    }

    return nestedGroupIds;
  }

  async mapAndCreateGroup(
    inputGroup: Group,
    sensors: Types.ObjectId[] = [],
    groups: Types.ObjectId[] = [],
  ): Promise<GroupDocument[] | undefined> {
    return await this.groupsService.createGroups([
      {
        managedObjectId: inputGroup.managedObjectId,
        name: inputGroup.managedObjectName,
        owner: inputGroup.owner,
        description: inputGroup.description,
        sensors: sensors,
        groups: groups,
      },
    ]);
  }
}
