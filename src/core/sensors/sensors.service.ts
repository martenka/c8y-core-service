import { Injectable } from '@nestjs/common';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { Sensor } from '../../models';
import { SensorDocument, SensorModel } from '../../models/Sensor';
import { InjectModel } from '@nestjs/mongoose';
import { SensorSearchOptions } from '../../models/types/types';
import { ensureArray, hasNoOwnKeys, notNil } from '../../utils/validation';
import {
  idToObjectID,
  pickBy,
  remapIDAndRemoveNil,
  awaitAllPromises,
} from '../../utils/helpers';
import { isNil } from '@nestjs/common/utils/shared.utils';

@Injectable()
export class SensorsService {
  constructor(@InjectModel(Sensor.name) private sensorModel: SensorModel) {}
  async createSensors(
    createSensorDtos: CreateSensorDto[],
  ): Promise<SensorDocument[] | undefined> {
    return await this.sensorModel.create(createSensorDtos);
  }

  async findMany(options: SensorSearchOptions): Promise<SensorDocument[]> {
    return ensureArray(
      await this.sensorModel.find({ ...remapIDAndRemoveNil(options) }).exec(),
    );
  }

  async findOne(
    options: SensorSearchOptions,
  ): Promise<SensorDocument | undefined> {
    const searchOptions = remapIDAndRemoveNil(options);
    if (hasNoOwnKeys(searchOptions)) {
      return undefined;
    }

    return await this.sensorModel.findOne({ ...searchOptions }).exec();
  }

  async updateSensors(
    updates: UpdateSensorDto[],
  ): Promise<SensorDocument[] | undefined> {
    const updatesInProgress: Promise<SensorDocument>[] = [];

    updates.forEach((update) => {
      const objectId = idToObjectID(update.id);

      if (isNil(objectId)) {
        return undefined;
      }

      updatesInProgress.push(
        this.sensorModel
          .findByIdAndUpdate(
            objectId,
            pickBy(update, (value) => notNil(value)),
            { returnDocument: 'after' },
          )
          .exec(),
      );
    });

    return (await awaitAllPromises(updatesInProgress)).fulfilled;
  }

  async removeSensor(id: string): Promise<SensorDocument | undefined> {
    const objectId = idToObjectID(id);

    if (isNil(objectId)) {
      return undefined;
    }

    return await this.sensorModel.findByIdAndDelete(objectId).exec();
  }
}
