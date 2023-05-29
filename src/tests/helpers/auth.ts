import { JwtModuleOptions } from '@nestjs/jwt/dist/interfaces/jwt-module-options.interface';
import { IAccessTokenPayload } from '../../core/auth/types/types';
import { JwtService } from '@nestjs/jwt';

export const getTestJwtConfig = (
  override?: Partial<JwtModuleOptions>,
): JwtModuleOptions => {
  return {
    signOptions: {
      algorithm: 'HS256',
      expiresIn: '1h',
    },
    secret: '123',
    verifyOptions: {
      algorithms: ['HS256'],
    },
    ...override,
  };
};

export function getTestJwtToken(
  payload: IAccessTokenPayload,
  jwtService: JwtService,
) {
  return jwtService.sign(payload);
}
