import { Injectable, Logger } from '@nestjs/common';
import { UserSearchOptions } from '../../global/query/types';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, UserModel } from '../../models/User';
import {
  idToObjectIDOrUndefined,
  nullToUndefined,
  removeNilProperties,
} from '../../utils/helpers';
import { hasNoOwnKeys, isPresent, notPresent } from '../../utils/validation';
import { CreateUserDto } from './dto/input/create-user.dto';
import { IDeleteUsers, IDeleteUsersResponse, IUpdateUser } from './dto/types';
import { Role } from '../../global/types/roles';
import { MessagesProducerService } from '../messages/messages-producer.service';
import { getDeletedIds } from '../../models/utils/utils';
import { Types } from 'mongoose';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly messagesProducerService: MessagesProducerService,
    @InjectModel(User.name)
    private userModel: UserModel,
  ) {}
  async findOne(
    options: UserSearchOptions,
    selectPassword?: boolean,
  ): Promise<UserDocument | undefined> {
    const searchOptions = removeNilProperties(options);
    if (hasNoOwnKeys(searchOptions)) {
      return undefined;
    }

    let query = this.userModel.findOne(searchOptions);
    if (selectPassword === true) {
      const passwordField: UserDocument['password'] = 'password';
      query = query.select(`+${passwordField}`);
    }

    return nullToUndefined(await query.exec());
  }

  async create(
    input: CreateUserDto,
  ): Promise<Omit<UserDocument, 'password'> | undefined> {
    const { role: roles, ...other } = input;

    if (roles?.length === 1 && roles[0] === Role.Admin) {
      roles.push(Role.User);
    }

    const user = await this.userModel.create({ roles, ...other });
    if (notPresent(user)) {
      return undefined;
    }
    user.password = undefined;

    this.logger.log(`Created user with username: ${user?.username ?? 'N/A'}`);
    return user;
  }

  /**
   * Deletes users locally and sends out messages to sync it with external services
   */
  async delete(input: IDeleteUsers): Promise<IDeleteUsersResponse> {
    const idsToDelete = idToObjectIDOrUndefined(input.items);

    const deletionTime = new Date().toISOString();

    const deleteResult = await this.userModel
      .deleteMany({
        _id: { $in: idsToDelete },
      })
      .exec();

    const deletedIds = await getDeletedIds(this.userModel, idsToDelete);
    deletedIds.forEach((id) =>
      this.messagesProducerService.sendUserMessage({
        id: id.toString(),
        deletedAt: deletionTime,
      }),
    );
    this.logger.log(`Deleted users with ids: ${deletedIds}`);

    return {
      deletedCount: deleteResult.deletedCount,
    };
  }

  /**
   * Returns the updated entity or **undefined** if user was not found
   */
  async updateOne(
    id: Types.ObjectId,
    input: IUpdateUser,
  ): Promise<UserDocument | undefined> {
    const updateData = removeNilProperties(input);
    updateData.c8yCredentials = removeNilProperties(
      updateData.c8yCredentials ?? {},
    );

    if (updateData.role?.includes(Role.Admin)) {
      updateData?.role.push(Role.User);
    }

    const setOperation = {};
    for (const key of Object.keys(updateData.c8yCredentials)) {
      setOperation[`c8yCredentials.${key}`] = updateData.c8yCredentials[key];
    }
    if (isPresent(updateData?.role)) {
      setOperation['roles'] = updateData.role;
    }

    const updatedUser = await this.userModel
      .findOneAndUpdate(
        { _id: id },
        {
          $set: setOperation,
        },
        { new: true },
      )
      .exec();

    if (notPresent(updatedUser)) {
      return undefined;
    }

    const leanUpdatedUser = updatedUser.toObject();
    this.messagesProducerService.sendUserMessage({
      id: leanUpdatedUser._id.toString(),
      c8yCredentials: leanUpdatedUser.c8yCredentials,
    });

    this.logger.log(`Updated user with id: ${leanUpdatedUser._id.toString()}`);
    return updatedUser;
  }
}
