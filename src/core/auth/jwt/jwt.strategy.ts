import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { ApplicationConfigService } from '../../application-config/application-config.service';
import { IAccessTokenPayload, LeanUser } from '../types/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: ApplicationConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtConfig.secret,
    });
  }

  async validate(payload: IAccessTokenPayload): Promise<LeanUser> {
    return { _id: payload.sub, username: payload.usr, roles: payload.roles };
  }
}
