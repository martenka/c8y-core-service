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
  PagingOptionsType,
} from '../../global/pagination/types';
import { GroupQueryOptions } from './query/group-query.dto';
import { FilterQuery } from 'mongoose';

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
      name: searchOptions.name,
    };

    return await this.pagingService.findWithPagination({
      model: this.groupModel,
      filter: removeNilProperties(filter),
      sort: { _id: -1 },
      pagingOptions,
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

    return await this.groupModel
      .findByIdAndDelete(objectId)
      .populate('sensors')
      .exec();
  }
}
