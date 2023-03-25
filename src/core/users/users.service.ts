import { Injectable, Logger } from '@nestjs/common';
import { UserSearchOptions } from '../../global/query/types';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, UserModel } from '../../models/User';
import { idToObjectID, removeNilProperties } from '../../utils/helpers';
import { hasNoOwnKeys, notNil } from '../../utils/validation';
import { CreateUserDto } from './dto/input/create-user.dto';
import { IDeleteUsers, IDeleteUsersResponse, IUpdateUser } from './dto/types';
import { Role } from '../../global/types/roles';
import { MessagesProducerService } from '../messages/messages-producer.service';

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

    return await query.exec();
  }

  async create(input: CreateUserDto): Promise<UserDocument> {
    const { role: roles, ...other } = input;

    if (roles?.length === 1 && roles[0] === Role.Admin) {
      roles.push(Role.User);
    }

    const user = await this.userModel.create({ roles, ...other });
    this.logger.log(`Created user with username: ${user?.username ?? 'N/A'}`);
    return user;
  }

  async deleteAndSendMessages(
    input: IDeleteUsers,
  ): Promise<IDeleteUsersResponse> {
    const idsToDelete = idToObjectID(input.items);

    const deletionTime = new Date().toISOString();

    const deleteResult = await this.userModel
      .deleteMany({
        _id: { $in: idsToDelete },
      })
      .exec();

    const deleteCheck = await this.userModel.find(
      {
        _id: { $in: idsToDelete },
      },
      { _id: 1 },
    );
    const existingIds = new Set(
      deleteCheck.map((user) => user.toObject()._id.toString()),
    );

    const deletedIds = input.items.filter((id) => !existingIds.has(id));
    deletedIds.forEach((id) =>
      this.messagesProducerService.sendUserMessage({
        id,
        deletedAt: deletionTime,
      }),
    );
    this.logger.log(`Deleted users with ids: ${deletedIds}`);

    return {
      deletedCount: deleteResult.deletedCount,
    };
  }

  async updateOne(
    id: string,
    input: IUpdateUser,
  ): Promise<UserDocument | undefined> {
    const objectId = idToObjectID(id);

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
    if (notNil(updateData?.role)) {
      setOperation['roles'] = updateData.role;
    }

    return await this.userModel
      .findOneAndUpdate(
        { _id: objectId },
        {
          $set: setOperation,
        },
        { new: true },
      )
      .exec();
  }
}
