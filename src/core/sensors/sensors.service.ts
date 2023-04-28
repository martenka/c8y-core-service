import { Injectable } from '@nestjs/common';
import { CreateSensorDtoProperties } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { Sensor } from '../../models';
import { SensorDocument, SensorModel } from '../../models/Sensor';
import { InjectModel } from '@nestjs/mongoose';
import { hasNoOwnKeys, notNil } from '../../utils/validation';
import {
  awaitAllPromises,
  idToObjectIDOrOriginal,
  idToObjectIDOrUndefined,
  nullToUndefined,
  omit,
  pickBy,
  remapCustomAttributes,
  remapIDAndRemoveNil,
  removeNilProperties,
} from '../../utils/helpers';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { SkipPagingService } from '../paging/skip-paging.service';
import { DBPagingResult, IPagingOptions } from '../../global/pagination/types';
import { SensorSearchOptions } from '../../global/query/types';
import { FilterQuery, QueryOptions } from 'mongoose';
import { Sort } from '../paging/types/types';
import { SensorQueryOptions } from './query/sensor-query.dto';
import { wrapFilterWithPrefixSearch } from '../../models/utils/utils';
import { SearchType } from '../../global/query/key-value';

@Injectable()
export class SensorsService {
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
      remapCustomAttributes(searchOptions);

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
    if (isNil(result)) {
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
    const updatesInProgress: Promise<SensorDocument>[] = [];

    updates.forEach((update) => {
      const objectId = idToObjectIDOrUndefined(update.id);

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
    const objectId = idToObjectIDOrUndefined(id);

    if (isNil(objectId)) {
      return undefined;
    }

    return nullToUndefined(
      await this.sensorModel.findByIdAndDelete(objectId).exec(),
    );
  }
}
