import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateGroupDtoProperties } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

import {
  ensureArray,
  hasNoOwnKeys,
  isPresent,
  notPresent,
} from '../../utils/validation';

import {
  awaitAllPromises,
  idToObjectIDOrOriginal,
  idToObjectIDOrUndefined,
  nullToUndefined,
  pickBy,
  remapIDAndRemoveNil,
  removeNilProperties,
} from '../../utils/helpers';

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
import { FilterQuery, Types } from 'mongoose';
import { Sort } from '../paging/types/types';
import { SearchType } from '../../global/query/key-value';
import { Sensor } from '../../models';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);
  constructor(
    @InjectModel(Group.name) private groupModel: GroupModel,
    private readonly pagingService: SkipPagingService,
  ) {}

  async createGroups(
    createGroupDto: CreateGroupDtoProperties[],
  ): Promise<GroupDocument[] | undefined> {
    const mappedGroupDtos: Partial<Group>[] = [];
    for (const dto of createGroupDto) {
      const groups = idToObjectIDOrUndefined(dto.groups);
      const sensors = idToObjectIDOrUndefined(dto.sensors);

      if (notPresent(groups) || notPresent(sensors)) {
        return undefined;
      }

      mappedGroupDtos.push({
        ...dto,
        sensors: sensors as unknown as Types.DocumentArray<Sensor>,
        groups: groups as unknown as Types.DocumentArray<Group>,
      });
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

    if (
      isPresent(searchOptions.searchType) &&
      [SearchType.PREFIX, SearchType.TOKEN].includes(
        searchOptions.searchType,
      ) &&
      notPresent(searchOptions.name)
    ) {
      throw new BadRequestException(
        `Name must be present for search type ${searchOptions.searchType}`,
      );
    }

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
        filter.$text = { $search: searchOptions.name! };
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
    return nullToUndefined(
      await this.groupModel.findOne(searchOptions).populate('sensors').exec(),
    );
  }

  async updateGroups(
    updates: UpdateGroupDto[],
  ): Promise<GroupDocument[] | undefined> {
    const updatesInProgress: Promise<GroupDocument | null>[] = [];
    let completedUpdates: GroupDocument[] | undefined = undefined;

    const session = await this.groupModel.startSession();
    try {
      await session.withTransaction(async () => {
        updates.forEach((update) => {
          const objectId = idToObjectIDOrUndefined(update.id);

          if (notPresent(objectId)) {
            return;
          }
          const { sensors, groups, ...otherItems } = pickBy(update, (value) =>
            isPresent(value),
          );

          const updatedGroup = this.groupModel
            .findByIdAndUpdate(
              objectId,
              {
                ...otherItems,
                $addToSet: {
                  sensors: {
                    $each: ensureArray(
                      idToObjectIDOrUndefined(sensors as Types.ObjectId[]),
                    ),
                    groups: {
                      $each: ensureArray(
                        idToObjectIDOrUndefined(groups as Types.ObjectId[]),
                      ),
                    },
                  },
                },
              },
              { returnDocument: 'after' },
            )
            .populate('sensors')
            .exec();

          if (notPresent(updatedGroup)) {
            throw new BadRequestException(
              `Group with id ${objectId.toString()} not found`,
            );
          }

          updatesInProgress.push(updatedGroup);
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

    return completedUpdates;
  }

  async removeGroup(id: string): Promise<GroupDocument | undefined> {
    const objectId = idToObjectIDOrUndefined(id);

    if (notPresent(objectId)) {
      return undefined;
    }

    return nullToUndefined(
      await this.groupModel.findByIdAndDelete(objectId).exec(),
    );
  }
}
