import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserDocument } from '../../models/User';
import { AccessResponse, IAccessTokenPayload, LeanUser } from './types/types';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UsersService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<LeanUser | undefined> {
    const user = await this.userService.findOne({ username });
    if (isNil(user)) {
      throw new UnauthorizedException();
    }
    return user.toObject();
  }

  login(user: LeanUser): AccessResponse {
    const payload: IAccessTokenPayload = {
      usr: user.username,
      sub: user._id,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(user: CreateUserDto): Promise<UserDocument> {
    return await this.userService.create(user);
  }
}
