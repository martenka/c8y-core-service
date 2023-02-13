import { Injectable } from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

import { ensureArray, hasNoOwnKeys, notNil } from '../../utils/validation';

import {
  awaitAllPromises,
  idToObjectID,
  pickBy,
  remapIDAndRemoveNil,
} from '../../utils/helpers';

import { isNil } from '@nestjs/common/utils/shared.utils';
import { Group, GroupDocument, GroupModel } from '../../models/Group';
import { InjectModel } from '@nestjs/mongoose';
import { GroupSearchOptions } from '../../global/query/types';

@Injectable()
export class GroupsService {
  constructor(@InjectModel(Group.name) private groupModel: GroupModel) {}

  async createGroups(
    createGroupDto: CreateGroupDto[],
  ): Promise<GroupDocument[] | undefined> {
    return await this.groupModel.create(createGroupDto, {});
  }

  async findAllGroups(): Promise<GroupDocument[]> {
    return ensureArray(await this.groupModel.find().populate('sensors').exec());
  }

  async findMany(options: GroupSearchOptions): Promise<GroupDocument[]> {
    return ensureArray(
      await this.groupModel
        .find({ ...remapIDAndRemoveNil(options) })
        .populate('sensors')
        .exec(),
    );
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
      const objectId = idToObjectID(update.id);

      if (isNil(objectId)) {
        return undefined;
      }
      const { sensors, ...otherItems } = pickBy(update, (value) =>
        notNil(value),
      );

      updatesInProgress.push(
        this.groupModel
          .findByIdAndUpdate(
            objectId,
            {
              ...otherItems,
              $addToSet: { sensors: { $each: ensureArray(sensors) } },
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
    const objectId = idToObjectID(id);

    if (isNil(objectId)) {
      return undefined;
    }

    return await this.groupModel
      .findByIdAndDelete(objectId)
      .populate('sensors')
      .exec();
  }
}
