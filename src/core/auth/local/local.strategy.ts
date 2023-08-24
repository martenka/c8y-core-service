import { AuthService } from '../auth.service';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoggedInUserType } from '../types/types';
import { notPresent } from '../../../utils/validation';

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
    if (notPresent(user)) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
