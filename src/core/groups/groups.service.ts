import { Injectable } from '@nestjs/common';
import { CreateGroupDtoProperties } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

import { ensureArray, hasNoOwnKeys, notNil } from '../../utils/validation';

import {
  awaitAllPromises,
  idToObjectIDOrOriginal,
  idToObjectIDOrUndefined,
  pickBy,
  remapIDAndRemoveNil,
  removeNilProperties,
} from '../../utils/helpers';

import { isNil } from '@nestjs/common/utils/shared.utils';
import { Group, GroupDocument, GroupModel } from '../../models/Group';
import { InjectModel } from '@nestjs/mongoose';
import { GroupSearchOptions } from '../../global/query/types';
import { SkipPagingService } from '../paging/skip-paging.service';
import {
  DBPagingResult,
  IPagingOptions,
  PagingOptionsType,
} from '../../global/pagination/types';
import { GroupQueryOptions } from './query/group-query.dto';
import { FilterQuery } from 'mongoose';
import { Sort } from '../paging/types/types';
import { SearchType } from '../../global/query/key-value';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private groupModel: GroupModel,
    private readonly pagingService: SkipPagingService,
  ) {}

  async createGroups(
    createGroupDto: CreateGroupDtoProperties[],
  ): Promise<GroupDocument[] | undefined> {
    const mappedGroupDtos = [];
    for (const dto of createGroupDto) {
      const groups = idToObjectIDOrUndefined(dto.groups);
      const sensors = idToObjectIDOrUndefined(dto.sensors);

      if (isNil(groups) || isNil(sensors)) {
        return undefined;
      }

      mappedGroupDtos.push({ ...dto, sensors, groups });
    }

    return await this.groupModel.create(mappedGroupDtos, {});
  }

  async findAllGroups(): Promise<GroupDocument[]> {
    return ensureArray(await this.groupModel.find().populate('sensors').exec());
  }

  async findMany(
    searchOptions: GroupQueryOptions,
    pagingOptions: PagingOptionsType,
  ): Promise<DBPagingResult<Group>> {
    const filter: FilterQuery<Group> = {
      _id: idToObjectIDOrOriginal(searchOptions.id),
    };
    let sort: Sort<Group> = {};
    const modifiedPagingOptions: IPagingOptions = pagingOptions;

    switch (searchOptions.searchType) {
      case SearchType.PREFIX: {
        filter.name = {
          $regex: `^${searchOptions.name}`,
          $options: 'i',
        };
        sort = { _id: -1 };
        break;
      }
      case SearchType.TOKEN: {
        filter.$text = { $search: searchOptions.name };
        filter.score = { $meta: 'textScore' };
        sort = { score: { $meta: 'textScore' } };
        modifiedPagingOptions.pageSize ??= 30;
        break;
      }
      default: {
        filter.name = searchOptions.name;
        sort = { _id: -1 };
      }
    }

    return await this.pagingService.findWithPagination({
      model: this.groupModel,
      filter: removeNilProperties(filter),
      sort,
      pagingOptions: modifiedPagingOptions,
    });
  }

  async findOne(
    options: GroupSearchOptions,
  ): Promise<GroupDocument | undefined> {
    const searchOptions = remapIDAndRemoveNil(options);
    if (hasNoOwnKeys(searchOptions)) {
      return undefined;
    }
    return await this.groupModel
      .findOne(searchOptions)
      .populate('sensors')
      .exec();
  }

  async updateGroups(
    updates: UpdateGroupDto[],
  ): Promise<GroupDocument[] | undefined> {
    const updatesInProgress: Promise<GroupDocument>[] = [];

    updates.forEach((update) => {
      const objectId = idToObjectIDOrUndefined(update.id);

      if (isNil(objectId)) {
        return undefined;
      }
      const { sensors, groups, ...otherItems } = pickBy(update, (value) =>
        notNil(value),
      );

      updatesInProgress.push(
        this.groupModel
          .findByIdAndUpdate(
            objectId,
            {
              ...otherItems,
              $addToSet: {
                sensors: {
                  $each: ensureArray(idToObjectIDOrUndefined(sensors)),
                  groups: {
                    $each: ensureArray(idToObjectIDOrUndefined(groups)),
                  },
                },
              },
            },
            { returnDocument: 'after' },
          )
          .populate('sensors')
          .exec(),
      );
    });

    return (await awaitAllPromises(updatesInProgress)).fulfilled;
  }

  async removeGroup(id: string): Promise<GroupDocument | undefined> {
    const objectId = idToObjectIDOrUndefined(id);

    if (isNil(objectId)) {
      return undefined;
    }

    return await this.groupModel.findByIdAndDelete(objectId).exec();
  }
}
