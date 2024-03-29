import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateSensorDtoProperties } from './dto/create-sensor.dto';
import {
  UpdateSensorsAttributesDto,
  UpdateSensorDto,
  DeleteSensorAttributesDto,
  UpdateOneSensorDto,
} from './dto/update-sensor.dto';
import { Sensor } from '../../models';
import { SensorDocument, SensorModel } from '../../models/Sensor';
import { InjectModel } from '@nestjs/mongoose';
import { hasNoOwnKeys, isPresent, notPresent } from '../../utils/validation';
import {
  awaitAllPromises,
  idToObjectIDOrOriginal,
  idToObjectIDOrUndefined,
  nullToUndefined,
  omit,
  remapKeyValueCustomAttributes,
  remapIDAndRemoveNil,
  removeNilProperties,
  pick,
} from '../../utils/helpers';
import { SkipPagingService } from '../paging/skip-paging.service';
import { DBPagingResult, IPagingOptions } from '../../global/pagination/types';
import { SensorSearchOptions } from '../../global/query/types';
import { FilterQuery, QueryOptions, Types, UpdateQuery } from 'mongoose';
import { Sort } from '../paging/types/types';
import { SensorQueryOptions } from './query/sensor-query.dto';
import {
  transformAttributesToQuery,
  transformKeysToUnsetForm,
  wrapFilterWithPrefixSearch,
} from '../../models/utils/utils';
import { SearchType } from '../../global/query/key-value';

@Injectable()
export class SensorsService {
  private readonly logger = new Logger('SensorsService');
  constructor(
    @InjectModel(Sensor.name)
    private sensorModel: SensorModel,
    private skipPagingService: SkipPagingService,
  ) {}
  async createSensors(
    createSensorDtos: CreateSensorDtoProperties[],
  ): Promise<SensorDocument[] | undefined> {
    return nullToUndefined(await this.sensorModel.create(createSensorDtos));
  }

  async findMany(
    searchOptions: SensorQueryOptions,
    pagingOptions: IPagingOptions,
  ): Promise<DBPagingResult<Sensor>> {
    const { customAttributesQuery, ...rest } =
      remapKeyValueCustomAttributes(searchOptions);

    const filterOptions: FilterQuery<Sensor> = {
      _id: idToObjectIDOrOriginal(searchOptions.id),
      ...omit(rest, 'id'),
    };
    let sort: Sort<Sensor> = {};

    if (searchOptions.query) {
      filterOptions.$text = { $search: searchOptions.query };
      filterOptions.score = { $meta: 'textScore' };
      sort = { score: { $meta: 'textScore' } };
    } else {
      sort = { _id: 1 };
    }
    let transformedFilter = {
      ...removeNilProperties(filterOptions),
      ...customAttributesQuery,
    };

    if (searchOptions.searchType === SearchType.PREFIX) {
      transformedFilter = wrapFilterWithPrefixSearch(transformedFilter);
    }

    return await this.skipPagingService.findWithPagination({
      model: this.sensorModel,
      filter: transformedFilter,
      sort,
      pagingOptions: pagingOptions,
    });
  }

  async findManyByFilterQuery(
    query: FilterQuery<Sensor>,
    queryOptions?: QueryOptions<Sensor>,
  ): Promise<SensorDocument[]> {
    const result = await this.sensorModel
      .find(query, undefined, queryOptions)
      .exec();
    if (notPresent(result)) {
      return [];
    }
    return result;
  }

  async findOne(
    options: SensorSearchOptions,
  ): Promise<SensorDocument | undefined> {
    const searchOptions = remapIDAndRemoveNil(options);
    if (hasNoOwnKeys(searchOptions)) {
      return undefined;
    }

    return nullToUndefined(
      await this.sensorModel.findOne({ ...searchOptions }).exec(),
    );
  }

  async updateSensors(
    updates: UpdateSensorDto[],
  ): Promise<SensorDocument[] | undefined> {
    const updatesInProgress: Promise<SensorDocument | null>[] = [];
    let completedUpdates: SensorDocument[] | undefined = undefined;

    const session = await this.sensorModel.startSession();
    try {
      await session.withTransaction(async () => {
        updates.forEach((update) => {
          const objectId = idToObjectIDOrUndefined(update.id);

          if (notPresent(objectId)) {
            return;
          }

          const updatedSensor = this.sensorModel
            .findByIdAndUpdate(
              objectId,
              removeNilProperties({
                ...omit(update, 'customAttributes'),
                ...(transformAttributesToQuery(
                  update.customAttributes,
                  'customAttributes' as keyof Sensor,
                ) ?? {}),
              }),
              { returnDocument: 'after' },
            )
            .exec();

          if (notPresent(updatedSensor)) {
            throw new BadRequestException(
              `Sensor with id ${objectId.toString()} not found`,
            );
          }

          updatesInProgress.push(updatedSensor);
        });
        completedUpdates = (
          await awaitAllPromises(updatesInProgress)
        ).fulfilled.filter(isPresent);
      });
    } catch (e) {
      await session.abortTransaction();
      await session.endSession();
      this.logger.error(e);

      return undefined;
    }

    await session.endSession();
    return completedUpdates;
  }

  async updateOne(
    id: Types.ObjectId,
    update: UpdateOneSensorDto,
  ): Promise<SensorDocument | undefined> {
    return nullToUndefined(
      await this.sensorModel
        .findByIdAndUpdate(id, update, { returnDocument: 'after' })
        .exec(),
    );
  }

  async updateSensorsByCommonIdentifiers(
    update: UpdateSensorsAttributesDto,
  ): Promise<void> {
    const updateFilter: FilterQuery<Sensor> = {
      valueFragmentType: update.identifiers.valueFragmentType,
      _id: isPresent(update.identifiers.sensorIds)
        ? { $in: update.identifiers.sensorIds }
        : undefined,
    };

    const updateQuery: UpdateQuery<Sensor> = {
      description: update.description,
      valueFragmentDisplayName: update.valueFragmentDisplayName,
      ...(transformAttributesToQuery(
        update.customAttributes,
        'customAttributes' as keyof Sensor,
      ) ?? {}),
    };

    await this.sensorModel
      .updateMany(
        removeNilProperties(updateFilter),
        removeNilProperties(updateQuery),
        {
          lean: true,
        },
      )
      .exec();
  }

  async removeSensorAttributesByCommonIdentifiers(
    update: DeleteSensorAttributesDto,
  ): Promise<void> {
    const updateFilter: FilterQuery<Sensor> = {
      valueFragmentType: update.identifiers.valueFragmentType,
      _id: isPresent(update.identifiers.sensorIds)
        ? { $in: update.identifiers.sensorIds }
        : undefined,
    };

    const fieldsToRemove = pick(
      update,
      'customAttributes',
      'description',
      'valueFragmentDisplayName',
    );

    const transformedFieldsToRemove = removeNilProperties(
      Object.fromEntries<number | undefined>(
        Object.entries(fieldsToRemove).map(([key, value]) => [
          key,
          value === true ? 1 : undefined,
        ]),
      ),
    );

    const customAttributesToRemove = !update.customAttributes
      ? transformKeysToUnsetForm(update.customAttributeKeys, 'customAttributes')
      : {};

    const updateQuery: UpdateQuery<Sensor> = {
      $unset: {
        ...customAttributesToRemove,
        ...transformedFieldsToRemove,
      },
    };

    await this.sensorModel
      .updateMany(removeNilProperties(updateFilter), updateQuery, {
        lean: true,
      })
      .exec();
  }

  async removeSensor(id: string): Promise<SensorDocument | undefined> {
    const objectId = idToObjectIDOrUndefined(id);

    if (notPresent(objectId)) {
      return undefined;
    }

    return nullToUndefined(
      await this.sensorModel.findByIdAndDelete(objectId).exec(),
    );
  }
}
