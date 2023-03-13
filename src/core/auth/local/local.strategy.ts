import { AuthService } from '../auth.service';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { LoggedInUserType } from '../types/types';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'username' });
  }

  async validate(
    username: string,
    password: string,
  ): Promise<LoggedInUserType> {
    const user = await this.authService.validateUser(username, password);
    if (isNil(user)) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
