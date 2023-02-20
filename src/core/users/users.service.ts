import { Injectable } from '@nestjs/common';
import { UserSearchOptions } from '../../global/query/types';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, UserModel } from '../../models/User';
import { removeNilProperties } from '../../utils/helpers';
import { hasNoOwnKeys } from '../../utils/validation';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
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

  async create(options: CreateUserDto) {
    return await this.userModel.create(options);
  }
}
